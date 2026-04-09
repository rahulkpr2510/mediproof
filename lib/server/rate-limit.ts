import { createHash } from "node:crypto";

type Entry = {
  shortCount: number;
  shortResetAt: number;
  longCount: number;
  longResetAt: number;
  blockedUntil: number;
  violations: number;
  violationsResetAt: number; // when violations counter decays
  lastSeenAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  headers: Record<string, string>;
};

type EnforceRateLimitArgs = {
  endpoint: string;
  ip: string;
  wallet?: string | null;
  unitId?: string;
};

const store = new Map<string, Entry>();

const DEFAULT_SHORT_WINDOW_MS = 60_000;
const DEFAULT_SHORT_LIMIT = 12;
const DEFAULT_LONG_WINDOW_MS = 60 * 60_000;
const DEFAULT_LONG_LIMIT = 120;
const DEFAULT_COOLDOWN_MS = 15 * 60_000;
const ENTRY_TTL_MS = 3 * 60 * 60_000;

function parseIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function hashPart(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function sanitizePart(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 160);
}

function makeKey(args: EnforceRateLimitArgs) {
  const endpoint = sanitizePart(args.endpoint).toLowerCase() || "unknown";
  const ip = sanitizePart(args.ip).toLowerCase() || "unknown";
  const wallet = sanitizePart(args.wallet ?? "").toLowerCase();
  const unitId = sanitizePart(args.unitId ?? "").toLowerCase();

  return [
    `ep:${hashPart(endpoint)}`,
    `ip:${hashPart(ip)}`,
    wallet ? `wa:${hashPart(wallet)}` : "wa:none",
    unitId ? `un:${hashPart(unitId)}` : "un:none",
  ].join("|");
}

function cleanup(now: number) {
  for (const [key, value] of store) {
    if (value.lastSeenAt + ENTRY_TTL_MS < now) {
      store.delete(key);
    }
  }
}

function toHeaders(
  shortLimit: number,
  shortRemaining: number,
  retryAfterSeconds: number,
) {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(shortLimit),
    "X-RateLimit-Remaining": String(Math.max(0, shortRemaining)),
    "Retry-After": String(Math.max(0, retryAfterSeconds)),
  };
}

export function enforceRateLimit(args: EnforceRateLimitArgs): RateLimitResult {
  const shortWindowMs = parseIntEnv(
    "AI_RATE_LIMIT_SHORT_WINDOW_MS",
    DEFAULT_SHORT_WINDOW_MS,
  );
  const shortLimit = parseIntEnv(
    "AI_RATE_LIMIT_SHORT_LIMIT",
    DEFAULT_SHORT_LIMIT,
  );
  const longWindowMs = parseIntEnv(
    "AI_RATE_LIMIT_LONG_WINDOW_MS",
    DEFAULT_LONG_WINDOW_MS,
  );
  const longLimit = parseIntEnv("AI_RATE_LIMIT_LONG_LIMIT", DEFAULT_LONG_LIMIT);
  const cooldownMs = parseIntEnv(
    "AI_RATE_LIMIT_COOLDOWN_MS",
    DEFAULT_COOLDOWN_MS,
  );

  const now = Date.now();
  cleanup(now);

  const key = makeKey(args);
  const current = store.get(key);

  const entry: Entry = current ?? {
    shortCount: 0,
    shortResetAt: now + shortWindowMs,
    longCount: 0,
    longResetAt: now + longWindowMs,
    blockedUntil: 0,
    violations: 0,
    violationsResetAt: now + longWindowMs,
    lastSeenAt: now,
  };

  entry.lastSeenAt = now;

  if (entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    store.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds,
      headers: toHeaders(shortLimit, 0, retryAfterSeconds),
    };
  }

  if (entry.shortResetAt <= now) {
    entry.shortCount = 0;
    entry.shortResetAt = now + shortWindowMs;
  }
  if (entry.longResetAt <= now) {
    entry.longCount = 0;
    entry.longResetAt = now + longWindowMs;
    // Violation decay: if a full long window passed without triggering a block,
    // give the client a clean slate so legitimate users aren't permanently penalised.
    if (entry.blockedUntil <= now) {
      entry.violations = 0;
      entry.violationsResetAt = now + longWindowMs;
    }
  }

  entry.shortCount += 1;
  entry.longCount += 1;

  const shortExceeded = entry.shortCount > shortLimit;
  const longExceeded = entry.longCount > longLimit;

  if (shortExceeded || longExceeded) {
    entry.violations += 1;
    // Exponential cooldown: tier 1 → 15 min, tier 2 → 60 min, tier 3+ → 4 hours
    const cooldownTier =
      entry.violations === 1 ? cooldownMs          // 15 min
      : entry.violations === 2 ? cooldownMs * 4    // 60 min
      : cooldownMs * 16;                           // 4 hours
    entry.blockedUntil = now + cooldownTier;

    const retryAt = Math.max(
      entry.shortResetAt,
      entry.longResetAt,
      entry.blockedUntil,
    );
    const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1000));

    store.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds,
      headers: toHeaders(shortLimit, 0, retryAfterSeconds),
    };
  }

  const shortRemaining = shortLimit - entry.shortCount;
  store.set(key, entry);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    headers: toHeaders(shortLimit, shortRemaining, 0),
  };
}
