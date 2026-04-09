import { prisma } from "@/lib/prisma";
import { createVerificationHash, validateQrPayload } from "@/lib/server/qr";
import { evaluateAnomalies } from "@/lib/server/anomaly";
import { getMedicineInfoFromGemini } from "@/lib/server/medicine-info";
import { ActorType, VerificationResult } from "@/lib/server/enums";

type ShipmentSummary = {
  shipmentId: string;
  senderWallet: string;
  receiverWallet: string;
  status: string;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
};

type ColdChainLogSummary = {
  shipmentId: string;
  temperature: number;
  timestamp: Date;
  safe: boolean;
};

type SupplyEventSummary = {
  eventType: string;
  actorWallet: string;
  timestamp: Date;
  locationHash: string | null;
};

function sanitizeText(value: string, maxLen: number) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLen);
}

export async function verifyUnitByPayload(input: {
  unitId: string;
  secretReference?: string;
  checksum?: string;
  scanNonce?: string;
  actorType: ActorType;
  actorWallet?: string;
  lat?: number;
  lng?: number;
  deviceFingerprint?: string;
  ip?: string;
}) {
  const unit = await prisma.unit.findUnique({
    where: { unitId: input.unitId },
    include: {
      batch: true,
      finalSales: { orderBy: { timestamp: "desc" }, take: 1 },
      supplyEvents: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!unit) {
    return {
      verdict: "RED" as VerificationResult,
      reasoning: [
        "Unit does not exist in the serialization registry. Likely counterfeit.",
      ],
      result: null,
    };
  }

  const reasoning: string[] = [];
  const criticalFlags: string[] = [];
  const warnFlags: string[] = [];

  // QR integrity check
  if (input.secretReference && input.checksum) {
    const qrOk = validateQrPayload({
      unitId: input.unitId,
      secretReference: input.secretReference,
      checksum: input.checksum,
    });
    if (!qrOk) {
      criticalFlags.push("QR_TAMPER");
      reasoning.push(
        "QR checksum mismatch — potential clone or tampering detected.",
      );
    }
  }

  // Batch safety checks
  const now = new Date();
  if (unit.batch.status === "RECALLED") {
    criticalFlags.push("RECALLED");
    reasoning.push(
      "This batch has been recalled by the manufacturer. Do not consume.",
    );
  }
  if (unit.batch.status === "EXPIRED" || now > unit.batch.expiryDate) {
    criticalFlags.push("EXPIRED");
    reasoning.push(
      `Medicine expired on ${unit.batch.expiryDate
        .toISOString()
        .slice(0, 10)}.`,
    );
  }
  if (unit.batch.status === "SUSPICIOUS") {
    warnFlags.push("SUSPICIOUS_BATCH");
    reasoning.push(
      "Batch has been flagged as suspicious due to anomaly patterns.",
    );
  }

  // Already sold guard
  // PUBLIC actor scanning an already-sold unit is a strong resale fraud signal → RED.
  // Supply-chain actor scanning it (e.g. audit) is informational → AMBER.
  if (unit.soldAt && unit.finalSales.length > 0) {
    const soldDateStr = unit.soldAt.toISOString().slice(0, 10);
    if (input.actorType === "PUBLIC") {
      criticalFlags.push("ALREADY_SOLD");
      reasoning.push(
        `Unit was already dispensed on ${soldDateStr}. A public scan after dispensing indicates a potential counterfeit clone in circulation.`,
      );
    } else {
      warnFlags.push("ALREADY_SOLD");
      reasoning.push(
        `Unit was already sold on ${soldDateStr}. Flagged for audit — verify this is a legitimate post-sale inspection.`,
      );
    }
  }

  // Update scan nonce proof
  if (input.secretReference && input.scanNonce) {
    const proof = createVerificationHash(
      input.unitId,
      input.secretReference,
      input.scanNonce,
    );
    await prisma.unit.update({
      where: { unitId: input.unitId },
      data: { qrNonceHash: proof },
    });
  }

  // Anomaly engine
  const anomalies = await evaluateAnomalies({
    unitId: unit.unitId,
    batchId: unit.batchId,
    lat: input.lat,
    lng: input.lng,
    deviceFingerprint: input.deviceFingerprint,
    actorType: input.actorType,
    actorWallet: input.actorWallet,
  });

  for (const anomaly of anomalies) {
    const safeDetails = sanitizeText(JSON.stringify(anomaly.details), 240);
    reasoning.push(
      `Anomaly [${anomaly.type}] - ${anomaly.severity}: ${safeDetails}`,
    );
    if (anomaly.severity === "CRITICAL") criticalFlags.push(anomaly.type);
    else warnFlags.push(anomaly.type);
  }

  // Verdict computation — deterministic, no ambiguity
  let verdict: VerificationResult = "GREEN";
  if (warnFlags.length > 0) verdict = "AMBER";
  if (criticalFlags.length > 0) verdict = "RED";

  // Shipment + cold-chain
  const shipments = await prisma.shipment.findMany({
    where: { batchId: unit.batchId },
    orderBy: { requestedAt: "asc" },
  });
  const shipmentSummaries: ShipmentSummary[] = shipments;
  const coldChainLogs = await prisma.coldChainLog.findMany({
    where: {
      shipmentId: { in: shipmentSummaries.map((s) => s.shipmentId) },
    },
    orderBy: { timestamp: "desc" },
  });
  const coldChainLogSummaries: ColdChainLogSummary[] = coldChainLogs;
  const coldChainOk =
    coldChainLogSummaries.length === 0 ||
    coldChainLogSummaries.every((l) => l.safe);
  if (!coldChainOk) {
    const breachCount = coldChainLogSummaries.filter((l) => !l.safe).length;
    reasoning.push(
      `Cold-chain breach detected on ${breachCount} hop(s). Temperature exceeded the 2°C–8°C safe window. Medicine integrity may be compromised.`,
    );
    if (verdict === "GREEN") verdict = "AMBER";
  }

  // Optional educational medicine info (server-side only, no API key exposure)
  const medicineInfo = await getMedicineInfoFromGemini(unit.batch.medicineName);
  const timelineEvents: SupplyEventSummary[] = unit.supplyEvents;

  // Persist scan log
  await prisma.scanLog.create({
    data: {
      unitId: unit.unitId,
      batchId: unit.batchId,
      lat: input.lat,
      lng: input.lng,
      ip: input.ip ? sanitizeText(input.ip, 64) : undefined,
      deviceFingerprint: input.deviceFingerprint
        ? sanitizeText(input.deviceFingerprint, 128)
        : undefined,
      actorType: input.actorType,
      actorWallet: input.actorWallet
        ? sanitizeText(input.actorWallet, 64)
        : undefined,
      result: verdict,
      reasoning: reasoning.map((line) => sanitizeText(line, 280)),
    },
  });

  return {
    verdict,
    reasoning,
    result: {
      unitId: unit.unitId,
      batchId: unit.batchId,
      medicineName: unit.batch.medicineName,
      medicineInfo: medicineInfo ?? undefined,
      manufactureDate: unit.batch.manufactureDate.toISOString().slice(0, 10),
      expiryDate: unit.batch.expiryDate.toISOString().slice(0, 10),
      batchStatus: unit.batch.status,
      verdict,
      verdictReasoning:
        reasoning.length > 0
          ? reasoning
          : ["No anomalies detected. Supply chain integrity confirmed."],
      timeline: timelineEvents.map((e) => ({
        label: e.eventType,
        actor: e.actorWallet,
        timestamp: e.timestamp.toISOString(),
        locationHash: e.locationHash ?? undefined,
      })),
      shipmentHistory: shipmentSummaries.map((s) => ({
        shipmentId: s.shipmentId,
        sender: s.senderWallet,
        receiver: s.receiverWallet,
        status: s.status,
        dispatchedAt: s.dispatchedAt?.toISOString(),
        deliveredAt: s.deliveredAt?.toISOString(),
      })),
      coldChainStatus: {
        ok: coldChainOk,
        logCount: coldChainLogSummaries.length,
        lastTemperatureC: coldChainLogSummaries[0]?.temperature,
        lastTimestamp: coldChainLogSummaries[0]?.timestamp.toISOString(),
        notes: coldChainOk
          ? coldChainLogSummaries.length === 0
            ? ["No cold-chain telemetry recorded for this shipment."]
            : ["All monitored hops remained within 2°C–8°C safe range."]
          : ["One or more cold-chain hops breached the 2°C–8°C safe window."],
      },
    },
  };
}
