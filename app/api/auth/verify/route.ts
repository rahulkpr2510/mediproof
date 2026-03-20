import { NextRequest } from "next/server";
import { verifyMessage } from "ethers";
import { z } from "zod";
import {
  buildSessionCookie,
  consumeWalletNonce,
  isValidWalletAddress,
  signSessionToken,
} from "@/lib/server/auth";
import { normalizeAddress } from "@/lib/server/crypto";
import { getRoleForWallet } from "@/lib/server/roles";

const requestSchema = z.object({
  address: z.string().trim().min(42).max(42),
  nonce: z.string().trim().min(16).max(128),
  signature: z.string().trim().min(40).max(1024),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = requestSchema.parse(await req.json());
    const address = normalizeAddress(parsed.address);
    if (!isValidWalletAddress(address)) {
      return Response.json({ error: "invalid address" }, { status: 400 });
    }

    const nonceRow = await consumeWalletNonce(address, parsed.nonce);
    if (!nonceRow) {
      return Response.json(
        { error: "invalid or expired nonce" },
        { status: 401 },
      );
    }

    const recovered = normalizeAddress(
      verifyMessage(nonceRow.message, parsed.signature),
    );

    if (recovered !== address) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }

    const token = signSessionToken(address);
    const role = await getRoleForWallet(address);

    return new Response(JSON.stringify({ ok: true, wallet: address, role }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildSessionCookie(token),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.errors[0]?.message ?? "invalid input" },
        { status: 400 },
      );
    }
    console.error(error);
    return Response.json(
      { error: "auth verification failed" },
      { status: 500 },
    );
  }
}
