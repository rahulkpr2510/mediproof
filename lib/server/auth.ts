import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";

type AuthNonceDelegate = {
  upsert: (args: {
    where: { wallet: string };
    update: {
      nonce: string;
      message: string;
      issuedAt: Date;
      expiresAt: Date;
      consumedAt: null;
    };
    create: {
      wallet: string;
      nonce: string;
      message: string;
      issuedAt: Date;
      expiresAt: Date;
    };
  }) => Promise<unknown>;
  findFirst: (args: {
    where: {
      wallet: string;
      nonce: string;
      consumedAt: null;
      expiresAt: { gt: Date };
    };
  }) => Promise<{ message: string } | null>;
  update: (args: {
    where: { wallet: string };
    data: { consumedAt: Date };
  }) => Promise<unknown>;
};

const authNonce = (prisma as unknown as { authNonce: AuthNonceDelegate })
  .authNonce;

const SESSION_COOKIE_NAME = "mg_session";
const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must be set and at least 32 chars");
  }
  return secret;
}

export function isValidWalletAddress(value: string) {
  return /^0x[a-f0-9]{40}$/i.test(value);
}

export async function issueWalletNonce(wallet: string, domain: string) {
  const normalized = normalizeAddress(wallet);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  const safeDomain =
    domain.replace(/[\r\n\t]/g, "").slice(0, 120) || "medi-guard";
  const message = [
    `${safeDomain} wants you to sign in with your wallet`,
    `Address: ${normalized}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
  ].join("\n");

  await authNonce.upsert({
    where: { wallet: normalized },
    update: {
      nonce,
      message,
      issuedAt,
      expiresAt,
      consumedAt: null,
    },
    create: {
      wallet: normalized,
      nonce,
      message,
      issuedAt,
      expiresAt,
    },
  });

  return { nonce, message, issuedAt, expiresAt };
}

export async function consumeWalletNonce(wallet: string, nonce: string) {
  const normalized = normalizeAddress(wallet);
  const now = new Date();

  const row = await authNonce.findFirst({
    where: {
      wallet: normalized,
      nonce,
      consumedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!row) return null;

  await authNonce.update({
    where: { wallet: normalized },
    data: { consumedAt: now },
  });

  return row;
}

export function signSessionToken(wallet: string) {
  const normalized = normalizeAddress(wallet);
  return jwt.sign({ sub: normalized, typ: "wallet" }, getSessionSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_TTL_SECONDS,
    issuer: "medi-guard",
    audience: "medi-guard-app",
  });
}

export function verifySessionToken(token: string) {
  const payload = jwt.verify(token, getSessionSecret(), {
    algorithms: ["HS256"],
    issuer: "medi-guard",
    audience: "medi-guard-app",
  }) as jwt.JwtPayload;

  const subject = typeof payload.sub === "string" ? payload.sub : "";
  if (!isValidWalletAddress(subject)) return null;
  return normalizeAddress(subject);
}

export function buildSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; HttpOnly; ${secure}SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function buildLogoutCookie() {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; ${secure}SameSite=Strict; Max-Age=0`;
}

export function getSessionWalletFromRequest(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!token) return null;

  try {
    return verifySessionToken(decodeURIComponent(token));
  } catch {
    return null;
  }
}
