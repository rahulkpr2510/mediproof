import { NextRequest } from "next/server";
import { getRoleForWallet } from "@/lib/server/roles";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    if (!wallet) return jsonError("unauthorized", 401);
    const role = await getRoleForWallet(wallet);
    return jsonOk({ role });
  } catch (error) {
    console.error(error);
    return jsonError("failed to get role", 500);
  }
}
