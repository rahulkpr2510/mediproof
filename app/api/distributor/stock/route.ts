import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["DISTRIBUTOR", "ADMIN"]);
    const normalized = normalizeAddress(wallet || "");

    // Units confirmed received by this distributor
    const received = await prisma.supplyEvent.findMany({
      where: {
        actorWallet: normalized,
        eventType: "DISTRIBUTOR_RECEIVED",
        receiverConfirmed: true,
      },
      select: { unitId: true },
      distinct: ["unitId"],
    });

    const unitIds = received.map((e) => e.unitId);

    // Exclude units that were later handed off (PHARMACY_RECEIVED or SOLD)
    const dispatched = await prisma.supplyEvent.findMany({
      where: {
        unitId: { in: unitIds },
        eventType: { in: ["PHARMACY_RECEIVED", "SOLD"] },
      },
      select: { unitId: true },
      distinct: ["unitId"],
    });

    const dispatchedIds = new Set(dispatched.map((e) => e.unitId));
    const heldIds = unitIds.filter((id) => !dispatchedIds.has(id));

    const units = await prisma.unit.findMany({
      where: {
        unitId: { in: heldIds },
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
    return jsonError("failed to fetch distributor stock", 400);
  }
}
