import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["MANUFACTURER", "ADMIN"]);
    const normalized = normalizeAddress(wallet || "");

    const incoming = await prisma.shipment.findMany({
      where: { senderWallet: normalized },
      orderBy: { requestedAt: "desc" },
      include: { batch: { select: { medicineName: true } } },
    });

    return jsonOk({ items: incoming });
  } catch {
    return jsonError("failed to fetch incoming shipments", 400);
  }
}
