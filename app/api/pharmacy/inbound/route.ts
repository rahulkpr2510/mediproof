import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["PHARMACY", "ADMIN"]);

    const receiver = normalizeAddress(wallet || "");
    const items = await prisma.shipment.findMany({
      where: { receiverWallet: receiver },
      orderBy: { requestedAt: "desc" },
    });

    return jsonOk({ items });
  } catch (error) {
    console.error(error);
    return jsonError("failed to fetch inbound shipments", 400);
  }
}
