import { NextRequest } from "next/server";
import { z } from "zod";
import { getManufacturerReputation } from "@/lib/server/reputation";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { normalizeAddress } from "@/lib/server/crypto";
import { requireRole } from "@/lib/server/roles";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-f0-9]{40}$/i, "invalid address");

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, [
      "MANUFACTURER",
      "DISTRIBUTOR",
      "PHARMACY",
      "ADMIN",
    ]);

    const requested = req.nextUrl.searchParams.get("address") || wallet || "";
    const manufacturer = normalizeAddress(addressSchema.parse(requested));

    const reputation = await getManufacturerReputation(manufacturer);
    return jsonOk({ reputation });
  } catch (error) {
    console.error(error);
    return jsonError("failed to compute reputation", 400);
  }
}
