import { NextRequest } from "next/server";
import { z } from "zod";
import { issueWalletNonce, isValidWalletAddress } from "@/lib/server/auth";
import { normalizeAddress } from "@/lib/server/crypto";
import { jsonError, jsonOk } from "@/lib/server/http";

const requestSchema = z.object({
  address: z.string().trim().min(42).max(42),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = requestSchema.parse(await req.json());
    const address = normalizeAddress(parsed.address);
    if (!isValidWalletAddress(address)) {
      return jsonError("invalid address", 400);
    }

    const domain = req.headers.get("host") || "medi-guard";
    const challenge = await issueWalletNonce(address, domain);

    return jsonOk({
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.errors[0]?.message ?? "invalid input", 400);
    }
    console.error(error);
    return jsonError("failed to issue nonce", 500);
  }
}
