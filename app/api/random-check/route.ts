import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const schema = z.object({
  batchId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid batchId"),
  sampleSize: z.number().int().positive().max(50).default(5),
  failedUnitIds: z
    .array(
      z
        .string()
        .trim()
        .regex(/^0x[a-f0-9]{64}$/i, "invalid unitId"),
    )
    .max(50)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["DISTRIBUTOR", "PHARMACY"]);

    const parsed = schema.parse(await req.json());
    const units: Array<{ unitId: string }> = await prisma.unit.findMany({
      where: { batchId: parsed.batchId },
      select: { unitId: true },
    });

    const shuffled = [...units].sort(() => Math.random() - 0.5);
    const selected = shuffled
      .slice(0, parsed.sampleSize)
      .map((unit: { unitId: string }) => unit.unitId);

    const validUnitIds = new Set(
      units.map((u: { unitId: string }) => u.unitId),
    );
    const failures = (parsed.failedUnitIds ?? []).filter((id) =>
      validUnitIds.has(id),
    );
    if (failures.length > 0) {
      await prisma.batch.update({
        where: { batchId: parsed.batchId },
        data: { status: "SUSPICIOUS" },
      });
    }

    return jsonOk({
      selected,
      failures,
      batchMarkedSuspicious: failures.length > 0,
    });
  } catch (error) {
    console.error(error);
    return jsonError("failed to run random check", 400);
  }
}
