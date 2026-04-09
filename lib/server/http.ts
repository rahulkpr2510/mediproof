import { NextRequest } from "next/server";
import { normalizeAddress } from "@/lib/server/crypto";

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function getActorWallet(req: NextRequest) {
  const raw = (req.headers.get("x-wallet-address") || "").trim();
  if (!raw) return null;
  try {
    const normalized = normalizeAddress(raw);
    return /^0x[a-f0-9]{40}$/i.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
