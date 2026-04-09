import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  chainRegisterBatch,
  chainSerializeUnit,
} from "@/lib/server/blockchain";
import {
  buildBatchId,
  buildUnitId,
  createQrChecksum,
  normalizeAddress,
  randomSalt,
} from "@/lib/server/crypto";
import { BATCH_STATUS } from "@/lib/server/enums";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

type UnitSeed = {
  unitId: string;
  batchId: string;
  serialNumber: number;
  secretReference: string;
  checksum: string;
};

const createBatchSchema = z.object({
  medicineName: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[^<>\u0000-\u001F\u007F]+$/, "invalid medicineName"),
  manufactureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalQuantity: z.number().int().positive().max(10_000),
  batchNumber: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._/-]+$/, "invalid batchNumber"),
});

const updateStatusSchema = z.object({
  batchId: z.string().min(10),
  status: z.enum(["ACTIVE", "RECALLED", "EXPIRED", "SUSPICIOUS"]),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    const role = await requireRole(wallet, ["MANUFACTURER", "ADMIN"]);
    const address = normalizeAddress(wallet || "");

    const items = await prisma.batch.findMany({
      where: role === "ADMIN" ? undefined : { manufacturer: address },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({
      items: items.map((b: { manufactureDate: Date; expiryDate: Date }) => ({
        ...b,
        manufactureDate: b.manufactureDate.toISOString().slice(0, 10),
        expiryDate: b.expiryDate.toISOString().slice(0, 10),
      })),
    });
  } catch {
    return jsonError("unauthorized", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["MANUFACTURER"]);

    const parsed = createBatchSchema.parse(await req.json());
    const mfgDate = new Date(parsed.manufactureDate);
    const expDate = new Date(parsed.expiryDate);
    if (expDate <= mfgDate)
      return jsonError("expiryDate must be after manufactureDate", 400);

    const manufacturer = normalizeAddress(wallet || "");
    const timestamp = Date.now();
    const salt = randomSalt(8);

    const batchId = buildBatchId({
      medicineName: parsed.medicineName,
      manufacturer,
      timestamp,
      randomSalt: salt,
      batchNumber: parsed.batchNumber,
    });

    // Check duplicate batchId (near-impossible but guard anyway)
    const existing = await prisma.batch.findUnique({ where: { batchId } });
    if (existing) return jsonError("batch ID collision, retry", 409);

    // Register on-chain (non-blocking for unit serialization)
    const chainHash = await chainRegisterBatch({
      batchId,
      medicineName: parsed.medicineName,
      manufactureDateUnix: Math.floor(mfgDate.getTime() / 1000),
      expiryDateUnix: Math.floor(expDate.getTime() / 1000),
      totalQuantity: parsed.totalQuantity,
    });

    const batch = await prisma.batch.create({
      data: {
        batchId,
        medicineName: parsed.medicineName,
        manufacturer,
        manufactureDate: mfgDate,
        expiryDate: expDate,
        totalQuantity: parsed.totalQuantity,
        status: BATCH_STATUS[0],
        blockchainAnchor: chainHash,
      },
    });

    // Build all units in memory first
    const units: UnitSeed[] = Array.from(
      { length: parsed.totalQuantity },
      (_, idx) => {
        const serialNumber = idx + 1;
        const secret = randomSalt(8);
        const unitSalt = randomSalt(8);
        const unitId = buildUnitId(batchId, serialNumber, unitSalt);
        return {
          unitId,
          batchId,
          serialNumber,
          secretReference: secret,
          checksum: createQrChecksum(unitId, secret),
        };
      },
    );

    // Bulk DB insert
    await prisma.unit.createMany({ data: units });

    // Bulk supply event insert
    await prisma.supplyEvent.createMany({
      data: units.map((u: UnitSeed) => ({
        unitId: u.unitId,
        eventType: "MANUFACTURED" as const,
        actorWallet: manufacturer,
        senderConfirmed: true,
        receiverConfirmed: true,
      })),
    });

    // Fire-and-forget on-chain serialization (don't block HTTP response)
    // For production, this should be a job queue (e.g. BullMQ)
    void (async () => {
      const CHUNK = 10;
      for (let i = 0; i < units.length; i += CHUNK) {
        const chunk = units.slice(i, i + CHUNK);
        await Promise.allSettled(
          chunk.map((u: UnitSeed) =>
            chainSerializeUnit(batchId, u.unitId, u.serialNumber),
          ),
        );
      }
    })();

    return jsonOk(
      {
        batch: {
          ...batch,
          manufactureDate: batch.manufactureDate.toISOString().slice(0, 10),
          expiryDate: batch.expiryDate.toISOString().slice(0, 10),
        },
        unitCount: units.length,
        unitsPreview: units.slice(0, 3).map((u: UnitSeed) => ({
          unitId: u.unitId,
          serialNumber: u.serialNumber,
          checksum: u.checksum,
        })),
      },
      201,
    );
  } catch (error) {
    console.error(error);
    return jsonError("failed to create batch", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    const role = await requireRole(wallet, ["MANUFACTURER", "ADMIN"]);
    const manufacturer = normalizeAddress(wallet || "");

    const parsed = updateStatusSchema.parse(await req.json());
    const batch = await prisma.batch.findUnique({
      where: { batchId: parsed.batchId },
    });
    if (!batch) return jsonError("batch not found", 404);
    if (role !== "ADMIN" && batch.manufacturer !== manufacturer)
      return jsonError("not your batch", 403);

    const updated = await prisma.batch.update({
      where: { batchId: parsed.batchId },
      data: { status: parsed.status },
    });

    return jsonOk({ batch: updated });
  } catch (error) {
    console.error(error);
    return jsonError("failed to update batch status", 400);
  }
}
