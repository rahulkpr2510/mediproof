import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyUnitByPayload } from "@/lib/server/verification";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { jsonError } from "@/lib/server/http";

const HASH_64_RE = /^0x[a-f0-9]{64}$/i;
const CHECKSUM_RE = /^0x[a-f0-9]{16}$/i;
const WALLET_RE = /^0x[a-f0-9]{40}$/i;
const SAFE_TOKEN_RE = /^[a-zA-Z0-9._:-]+$/;
const SAFE_DEVICE_FINGERPRINT_RE = /^[a-zA-Z0-9 .,:;()/_-]+$/;

const schema = z.object({
  unitId: z.string().trim().regex(HASH_64_RE, "invalid unitId format"),
  secretReference: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{8,128}$/i, "invalid secretReference format")
    .optional(),
  checksum: z
    .string()
    .trim()
    .regex(CHECKSUM_RE, "invalid checksum format")
    .optional(),
  scanNonce: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(SAFE_TOKEN_RE, "invalid scanNonce format")
    .optional(),
  actorWallet: z
    .string()
    .trim()
    .regex(WALLET_RE, "invalid actorWallet format")
    .optional(),
  actorType: z
    .enum(["PUBLIC", "MANUFACTURER", "DISTRIBUTOR", "PHARMACY", "ADMIN"])
    .default("PUBLIC"),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  deviceFingerprint: z
    .string()
    .trim()
    .max(128)
    .regex(SAFE_DEVICE_FINGERPRINT_RE, "invalid deviceFingerprint format")
    .optional(),
});

function normalizeClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const candidate = (
    forwarded?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown"
  ).trim();
  return (
    candidate.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 64) || "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const ip = normalizeClientIp(req);
    const limiter = enforceRateLimit({
      endpoint: "verify-ai",
      ip,
      wallet: body.actorWallet,
      unitId: body.unitId,
    });

    if (!limiter.allowed) {
      return Response.json(
        {
          error: "rate_limited",
          message:
            "Too many verification requests. Please wait before trying again.",
        },
        {
          status: 429,
          headers: limiter.headers,
        },
      );
    }

    const { verdict, result } = await verifyUnitByPayload({
      ...body,
      ip,
    });

    // Unit not found — return 404 so frontend can show RED explicitly
    if (!result) {
      return Response.json(
        { error: "unit_not_found" },
        { status: 404, headers: limiter.headers },
      );
    }

    return Response.json(
      { verdict, result },
      { status: 200, headers: limiter.headers },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "invalid input", 400);
    }
    console.error("[verify]", err);
    return jsonError("verification_failed", 500);
  }
}
