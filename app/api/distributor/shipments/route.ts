import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  chainRecordShipment,
  chainConfirmDelivery,
} from "@/lib/server/blockchain";
import { normalizeAddress, randomSalt } from "@/lib/server/crypto";
import { getActorWallet, jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/lib/server/roles";

const createSchema = z.object({
  batchId: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{64}$/i, "invalid batchId"),
  senderWallet: z
    .string()
    .trim()
    .regex(/^0x[a-f0-9]{40}$/i, "invalid senderWallet"),
  unitStart: z.number().int().positive(),
  unitEnd: z.number().int().positive(),
});

const updateSchema = z.object({
  shipmentId: z
    .string()
    .trim()
    .regex(/^SHP-0x[a-f0-9]{24}$/i, "invalid shipmentId"),
  action: z.enum(["approve", "dispatch", "confirm"]),
});

export async function GET(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, [
      "DISTRIBUTOR",
      "MANUFACTURER",
      "PHARMACY",
      "ADMIN",
    ]);
    const normalized = normalizeAddress(wallet || "");

    const shipments = await prisma.shipment.findMany({
      where: {
        OR: [{ senderWallet: normalized }, { receiverWallet: normalized }],
      },
      orderBy: { requestedAt: "desc" },
    });

    return jsonOk({ items: shipments });
  } catch {
    return jsonError("failed to fetch shipments", 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["DISTRIBUTOR", "PHARMACY"]);
    const receiverWallet = normalizeAddress(wallet || "");

    const parsed = createSchema.parse(await req.json());
    const senderWallet = normalizeAddress(parsed.senderWallet);

    if (parsed.unitEnd < parsed.unitStart) {
      return jsonError("unitEnd must be >= unitStart", 400);
    }

    const batch = await prisma.batch.findUnique({
      where: { batchId: parsed.batchId },
    });
    if (!batch) return jsonError("batch not found", 404);
    if (batch.status === "RECALLED") return jsonError("batch is recalled", 400);

    const quantity = parsed.unitEnd - parsed.unitStart + 1;
    const shipmentId = `SHP-${randomSalt(12)}`;

    const shipment = await prisma.shipment.create({
      data: {
        shipmentId,
        batchId: parsed.batchId,
        senderWallet,
        receiverWallet,
        unitStart: parsed.unitStart,
        unitEnd: parsed.unitEnd,
        quantity,
        status: "REQUESTED",
      },
    });

    return jsonOk({ shipment }, 201);
  } catch (error) {
    console.error(error);
    return jsonError("failed to create shipment", 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const wallet = getActorWallet(req);
    await requireRole(wallet, ["DISTRIBUTOR", "MANUFACTURER", "PHARMACY"]);
    const normalized = normalizeAddress(wallet || "");

    const parsed = updateSchema.parse(await req.json());

    const shipment = await prisma.shipment.findUnique({
      where: { shipmentId: parsed.shipmentId },
    });
    if (!shipment) return jsonError("shipment not found", 404);

    // ── approve ───────────────────────────────────────────────────────────────
    if (parsed.action === "approve") {
      if (shipment.status !== "REQUESTED") {
        return jsonError("shipment is not in REQUESTED state", 400);
      }
      if (shipment.senderWallet !== normalized) {
        return jsonError("only the sender can approve", 403);
      }

      const updated = await prisma.shipment.update({
        where: { shipmentId: parsed.shipmentId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });

      return jsonOk({ shipment: updated });
    }

    // ── dispatch ──────────────────────────────────────────────────────────────
    if (parsed.action === "dispatch") {
      if (shipment.status !== "APPROVED") {
        return jsonError("shipment must be APPROVED before dispatch", 400);
      }
      if (shipment.senderWallet !== normalized) {
        return jsonError("only the sender can dispatch", 403);
      }

      const chainHash = await chainRecordShipment(
        shipment.shipmentId,
        shipment.batchId,
        shipment.senderWallet,
        shipment.receiverWallet,
      );

      await prisma.$transaction([
        prisma.shipment.update({
          where: { shipmentId: parsed.shipmentId },
          data: {
            status: "DISPATCHED",
            dispatchedAt: new Date(),
            blockchainAnchor: chainHash || null,
          },
        }),
      ]);

      return jsonOk({
        shipmentId: parsed.shipmentId,
        status: "DISPATCHED",
        chainHash,
      });
    }

    // ── confirm receipt ───────────────────────────────────────────────────────
    if (parsed.action === "confirm") {
      if (shipment.status !== "DISPATCHED") {
        return jsonError("shipment must be DISPATCHED before confirming", 400);
      }
      if (shipment.receiverWallet !== normalized) {
        return jsonError("only the receiver can confirm receipt", 403);
      }

      const chainHash = await chainConfirmDelivery(shipment.shipmentId);

      const receiverRole = await prisma.roleAssignment.findUnique({
        where: { wallet: normalized },
      });
      const eventType =
        receiverRole?.role === "PHARMACY"
          ? "PHARMACY_RECEIVED"
          : "DISTRIBUTOR_RECEIVED";

      const units = await prisma.unit.findMany({
        where: {
          batchId: shipment.batchId,
          serialNumber: { gte: shipment.unitStart, lte: shipment.unitEnd },
        },
        select: { unitId: true },
      });

      await prisma.$transaction([
        prisma.shipment.update({
          where: { shipmentId: parsed.shipmentId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            blockchainAnchor: chainHash || null,
          },
        }),
        prisma.supplyEvent.createMany({
          data: units.map((u) => ({
            unitId: u.unitId,
            eventType,
            actorWallet: normalized,
            receiverConfirmed: true,
          })),
          skipDuplicates: true,
        }),
      ]);

      return jsonOk({
        shipmentId: parsed.shipmentId,
        status: "DELIVERED",
        chainHash,
      });
    }

    return jsonError("unknown action", 400);
  } catch (error) {
    console.error(error);
    return jsonError("failed to update shipment", 400);
  }
}
