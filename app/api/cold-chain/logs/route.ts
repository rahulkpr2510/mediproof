import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const createSchema = z.object({
  shipmentId: z
    .string()
    .trim()
    .regex(/^SHP-0x[a-f0-9]{24}$/i, "invalid shipmentId"),
  temperature: z.number().min(-100).max(100),
  location: z
    .string()
    .trim()
    .max(120)
    .regex(/^[^<>\u0000-\u001F\u007F]*$/, "invalid location")
    .optional(),
});

const getQuerySchema = z.object({
  shipmentId: z
    .string()
    .trim()
    .regex(/^SHP-0x[a-f0-9]{24}$/i, "invalid shipmentId")
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, [
      "MANUFACTURER",
      "DISTRIBUTOR",
      "PHARMACY",
      "ADMIN",
    ]);

    const shipmentId = getQuerySchema.parse({
      shipmentId: req.nextUrl.searchParams.get("shipmentId") ?? undefined,
    }).shipmentId;
    const logs = await prisma.coldChainLog.findMany({
      where: shipmentId ? { shipmentId } : undefined,
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    return jsonOk({ logs });
  } catch {
    return jsonError("failed to fetch cold chain logs", 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["MANUFACTURER", "DISTRIBUTOR", "PHARMACY"]);

    const parsed = createSchema.parse(await req.json());
    const safe = parsed.temperature >= 2 && parsed.temperature <= 8;

    const log = await prisma.coldChainLog.create({
      data: {
        shipmentId: parsed.shipmentId,
        temperature: parsed.temperature,
        location: parsed.location,
        safe,
      },
    });

    // Mark batch suspicious on cold chain breach
    if (!safe) {
      const shipment = await prisma.shipment.findUnique({
        where: { shipmentId: parsed.shipmentId },
      });
      if (shipment) {
        await prisma.batch.update({
          where: { batchId: shipment.batchId },
          data: { status: "SUSPICIOUS" },
        });
      }
    }

    return jsonOk({ log, safe }, 201);
  } catch (error) {
    console.error(error);
    return jsonError("failed to record cold chain log", 400);
  }
}
