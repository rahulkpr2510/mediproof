import { prisma } from "@/lib/prisma";
import { chainGetRole } from "@/lib/server/blockchain";
import { normalizeAddress } from "@/lib/server/crypto";
import { ROLE_TYPES, RoleType } from "@/lib/server/enums";

function isRoleType(value: string): value is RoleType {
  return (ROLE_TYPES as readonly string[]).includes(value);
}

export async function getRoleForWallet(
  wallet?: string | null,
): Promise<RoleType> {
  if (!wallet) return "NONE";
  const normalized = normalizeAddress(wallet);

  // DB-first: cheap, fast, consistent
  const record = await prisma.roleAssignment.findUnique({
    where: { wallet: normalized },
  });
  if (record && record.role !== "NONE") return record.role as RoleType;

  // Chain fallback: only when DB has no record
  const onchainRole = await chainGetRole(normalized).catch(() => null);
  if (onchainRole && onchainRole !== "NONE" && isRoleType(onchainRole)) {
    // Sync back into DB so future calls are fast
    await prisma.roleAssignment.upsert({
      where: { wallet: normalized },
      update: { role: onchainRole },
      create: { wallet: normalized, role: onchainRole },
    });
    return onchainRole;
  }

  return "NONE";
}

export async function requireRole(
  wallet: string | null | undefined,
  roles: RoleType[],
): Promise<RoleType> {
  const role = await getRoleForWallet(wallet);
  if (!roles.includes(role)) {
    throw new Error(`Unauthorized: role ${role} not in [${roles.join(", ")}]`);
  }
  return role;
}
