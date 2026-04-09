import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";
import { normalizeAddress } from "@/lib/server/crypto";

type QrBatchUnit = {
  unitId: string;
  serialNumber: number;
  secretReference: string;
  checksum: string;
};

const querySchema = z.object({
  batchId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid batchId"),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    const role = await requireRole(wallet, ["MANUFACTURER", "ADMIN"]);

    const batchId = querySchema.parse({
      batchId: req.nextUrl.searchParams.get("batchId"),
    }).batchId;

    const batch = await prisma.batch.findUnique({
      where: { batchId },
      include: {
        units: {
          select: {
            unitId: true,
            serialNumber: true,
            secretReference: true,
            checksum: true,
          },
          orderBy: { serialNumber: "asc" },
        },
      },
    });
    if (!batch) return jsonError("batch not found", 404);

    const manufacturer = normalizeAddress(wallet || "");
    if (role !== "ADMIN" && batch.manufacturer !== manufacturer)
      return jsonError("not your batch", 403);

    const units: QrBatchUnit[] = batch.units;

    return jsonOk({
      batchId,
      medicineName: batch.medicineName,
      expiryDate: batch.expiryDate,
      units: units.map((u: QrBatchUnit) => ({
        unitId: u.unitId,
        serialNumber: u.serialNumber,
        secretReference: u.secretReference,
        checksum: u.checksum,
        // QR payload string that gets encoded into the QR code
        qrString: JSON.stringify({
          unitId: u.unitId,
          s: u.secretReference,
          c: u.checksum,
        }),
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonError("failed to export QR batch", 400);
  }
}
