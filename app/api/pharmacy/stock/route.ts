import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const sellSchema = z.object({
  unitId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid unitId"),
  patientRef: z.string().optional(),
});

// GET — fetch all units currently held by this pharmacy
export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["PHARMACY", "ADMIN"]);
    const normalized = normalizeAddress(wallet || "");

    // Units that had their last supply event at this pharmacy
    const events = await prisma.supplyEvent.findMany({
      where: {
        actorWallet: normalized,
        eventType: "PHARMACY_RECEIVED",
        receiverConfirmed: true,
      },
      select: { unitId: true },
      distinct: ["unitId"],
    });

    const unitIds = events.map((e) => e.unitId);

    const units = await prisma.unit.findMany({
      where: {
        unitId: { in: unitIds },
        soldAt: null,
      },
      include: {
        batch: {
          select: {
            medicineName: true,
            expiryDate: true,
            batchId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ items: units });
  } catch {
    return jsonError("failed to fetch stock", 400);
  }
}

// POST — sell / dispense a unit to a patient
export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["PHARMACY"]);
    const normalized = normalizeAddress(wallet || "");

    const parsed = sellSchema.parse(await req.json());

    const unit = await prisma.unit.findUnique({
      where: { unitId: parsed.unitId },
    });
    if (!unit) return jsonError("unit not found", 404);
    if (unit.soldAt) {
      return jsonError("unit is already sold and cannot be dispensed", 400);
    }

    await prisma.$transaction([
      prisma.unit.update({
        where: { unitId: parsed.unitId },
        data: { soldAt: new Date() },
      }),
      prisma.supplyEvent.create({
        data: {
          unitId: parsed.unitId,
          eventType: "SOLD",
          actorWallet: normalized,
          senderConfirmed: true,
          receiverConfirmed: true,
        },
      }),
    ]);

    return jsonOk({ unitId: parsed.unitId, status: "SOLD" });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message, 400);
    return jsonError("failed to dispense unit", 400);
  }
}
