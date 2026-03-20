import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chainFinalizeSale } from "@/lib/server/blockchain";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const saleSchema = z.object({
  unitId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid unitId"),
  buyerWallet: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{40}$/i, "invalid buyerWallet"),
  pharmacySignature: z
    .string()
    .trim()
    .min(8)
    .max(1024)
    .regex(/^0x[a-f0-9]+$/i, "invalid pharmacySignature"),
  buyerSignature: z
    .string()
    .trim()
    .min(8)
    .max(1024)
    .regex(/^0x[a-f0-9]+$/i, "invalid buyerSignature"),
  locationHash: z
    .string()
    .trim()
    .max(128)
    .regex(/^[a-zA-Z0-9:_./+-]+$/, "invalid locationHash")
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["PHARMACY", "ADMIN"]);
    const pharmacy = normalizeAddress(wallet || "");

    const items = await prisma.finalSale.findMany({
      where: { pharmacyWallet: pharmacy },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return jsonOk({ items });
  } catch {
    return jsonError("failed to fetch sales", 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["PHARMACY"]);
    const pharmacyWallet = normalizeAddress(wallet || "");

    const parsed = saleSchema.parse(await req.json());
    const buyerWallet = normalizeAddress(parsed.buyerWallet);

    const unit = await prisma.unit.findUnique({
      where: { unitId: parsed.unitId },
      include: { batch: true },
    });
    if (!unit) return jsonError("unit not found", 404);

    // Double-sell guard
    if (unit.soldAt) return jsonError("unit already sold", 409);

    // Batch safety guard
    if (unit.batch.status === "RECALLED")
      return jsonError("batch is recalled", 400);
    if (unit.batch.status === "EXPIRED" || new Date() > unit.batch.expiryDate) {
      return jsonError("batch is expired", 400);
    }

    // Verify unit reached this pharmacy via supply chain
    const pharmacyReceived = await prisma.supplyEvent.findFirst({
      where: {
        unitId: parsed.unitId,
        eventType: "PHARMACY_RECEIVED",
        actorWallet: pharmacyWallet,
      },
    });
    if (!pharmacyReceived)
      return jsonError("unit not in pharmacy custody", 403);

    const chainHash = await chainFinalizeSale(
      unit.unitId,
      buyerWallet,
      parsed.pharmacySignature,
      parsed.buyerSignature,
    );

    const [sale] = await prisma.$transaction([
      prisma.finalSale.create({
        data: {
          unitId: unit.unitId,
          batchId: unit.batchId,
          pharmacyWallet,
          buyerWallet,
          pharmacySignature: parsed.pharmacySignature,
          buyerSignature: parsed.buyerSignature,
          blockchainAnchor: chainHash,
        },
      }),
      prisma.unit.update({
        where: { unitId: unit.unitId },
        data: { soldAt: new Date() },
      }),
      prisma.supplyEvent.create({
        data: {
          unitId: unit.unitId,
          eventType: "SOLD",
          actorWallet: pharmacyWallet,
          locationHash: parsed.locationHash || undefined,
          senderConfirmed: true,
          receiverConfirmed: true,
        },
      }),
    ]);

    return jsonOk({ sale }, 201);
  } catch (error) {
    console.error(error);
    return jsonError("failed to complete sale", 400);
  }
}
