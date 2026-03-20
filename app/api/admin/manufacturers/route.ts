import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chainAssignRole, chainRevokeRole } from "@/lib/server/blockchain";
import { normalizeAddress } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const bodySchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{40}$/i, "invalid address"),
  name: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const roles = await prisma.roleAssignment.findMany({
      where: { role: "MANUFACTURER" },
      orderBy: { createdAt: "desc" },
    });

    const snapshots = await prisma.manufacturerReputationSnapshot.findMany({
      where: {
        manufacturer: {
          in: roles.map((r: { wallet: string }) => r.wallet),
        },
      },
      orderBy: { computedAt: "desc" },
      distinct: ["manufacturer"],
    });

    const scoreMap = new Map(
      snapshots.map((s: { manufacturer: string; score: number }) => [
        s.manufacturer,
        s.score,
      ]),
    );

    return jsonOk({
      items: roles.map((role: { wallet: string; createdAt: Date }) => ({
        address: role.wallet,
        createdAt: role.createdAt,
        reputationScore: scoreMap.get(role.wallet) ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonError("unauthorized", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const parsed = bodySchema.parse(await req.json());
    const normalized = normalizeAddress(parsed.address);

    const item = await prisma.roleAssignment.upsert({
      where: { wallet: normalized },
      update: { role: "MANUFACTURER" },
      create: { wallet: normalized, role: "MANUFACTURER" },
    });

    await chainAssignRole(normalized, "MANUFACTURER");

    return jsonOk({
      item: { address: item.wallet, createdAt: item.createdAt },
    });
  } catch (error) {
    console.error(error);
    return jsonError("failed to assign role", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const parsed = bodySchema.pick({ address: true }).parse(await req.json());
    const normalized = normalizeAddress(parsed.address);

    await prisma.roleAssignment.upsert({
      where: { wallet: normalized },
      update: { role: "NONE" },
      create: { wallet: normalized, role: "NONE" },
    });

    await chainRevokeRole(normalized);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("failed to revoke role", 400);
  }
}
