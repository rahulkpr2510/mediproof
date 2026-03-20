import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";
import { normalizeAddress } from "@/lib/server/crypto";

const querySchema = z.object({
  unitId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid unitId"),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, [
      "MANUFACTURER",
      "ADMIN",
      "PHARMACY",
      "DISTRIBUTOR",
    ]);

    const unitId = querySchema.parse({
      unitId: req.nextUrl.searchParams.get("unitId"),
    }).unitId;

    const unit = await prisma.unit.findUnique({
      where: { unitId },
      include: {
        batch: {
          select: {
            medicineName: true,
            manufacturer: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });
    if (!unit) return jsonError("unit not found", 404);

    // Only manufacturer of this batch can export QR secrets
    const manufacturer = normalizeAddress(wallet || "");
    if (unit.batch.manufacturer !== manufacturer) {
      const role = await requireRole(wallet, ["ADMIN"]).catch(() => null);
      if (!role) return jsonError("access denied", 403);
    }

    return jsonOk({
      qrPayload: {
        unitId: unit.unitId,
        secretReference: unit.secretReference,
        checksum: unit.checksum,
        medicineName: unit.batch.medicineName,
        expiryDate: unit.batch.expiryDate,
        batchStatus: unit.batch.status,
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError("failed to fetch QR payload", 400);
  }
}
