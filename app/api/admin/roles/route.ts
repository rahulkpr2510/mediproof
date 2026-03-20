import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chainAssignRole, chainRevokeRole } from "@/lib/server/blockchain";
import { normalizeAddress } from "@/lib/server/crypto";
import { ROLE_TYPES } from "@/lib/server/enums";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const assignSchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{40}$/i, "invalid address"),
  role: z.enum(["MANUFACTURER", "DISTRIBUTOR", "PHARMACY", "ADMIN"]),
});

const revokeSchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{40}$/i, "invalid address"),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const items = await prisma.roleAssignment.findMany({
      orderBy: { createdAt: "desc" },
      where: { role: { in: ROLE_TYPES.filter((r) => r !== "NONE") } },
    });

    return jsonOk({ items });
  } catch (error) {
    console.error(error);
    return jsonError("unauthorized", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const parsed = assignSchema.parse(await req.json());
    const normalized = normalizeAddress(parsed.address);

    const item = await prisma.roleAssignment.upsert({
      where: { wallet: normalized },
      update: { role: parsed.role },
      create: { wallet: normalized, role: parsed.role },
    });

    await chainAssignRole(normalized, parsed.role);

    return jsonOk({ item }, 201);
  } catch (error) {
    console.error(error);
    return jsonError("failed to assign role", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["ADMIN"]);

    const parsed = revokeSchema.parse(await req.json());
    const normalized = normalizeAddress(parsed.address);

    const item = await prisma.roleAssignment.upsert({
      where: { wallet: normalized },
      update: { role: "NONE" },
      create: { wallet: normalized, role: "NONE" },
    });

    await chainRevokeRole(normalized);

    return jsonOk({ item });
  } catch (error) {
    console.error(error);
    return jsonError("failed to revoke role", 400);
  }
}
