import { prisma } from "@/lib/prisma";
import { createVerificationHash, validateQrPayload } from "@/lib/server/qr";
import { evaluateAnomalies } from "@/lib/server/anomaly";
import { getMedicineInfoFromGemini } from "@/lib/server/medicine-info";
import { ActorType, VerificationResult } from "@/lib/server/enums";

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
  if (unit.soldAt && unit.finalSales.length > 0) {
    warnFlags.push("ALREADY_SOLD");
    reasoning.push(
      `Unit was already sold on ${unit.soldAt
        .toISOString()
        .slice(0, 10)}. Potential resale fraud.`,
    );
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
  const coldChainLogs = await prisma.coldChainLog.findMany({
    where: { shipmentId: { in: shipments.map((s) => s.shipmentId) } },
    orderBy: { timestamp: "desc" },
  });
  const coldChainOk =
    coldChainLogs.length === 0 || coldChainLogs.every((l) => l.safe);
  if (!coldChainOk && verdict === "GREEN") verdict = "AMBER";

  // Optional educational medicine info (server-side only, no API key exposure)
  const medicineInfo = await getMedicineInfoFromGemini(unit.batch.medicineName);

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
      timeline: unit.supplyEvents.map((e) => ({
        label: e.eventType,
        actor: e.actorWallet,
        timestamp: e.timestamp.toISOString(),
        locationHash: e.locationHash ?? undefined,
      })),
      shipmentHistory: shipments.map((s) => ({
        shipmentId: s.shipmentId,
        sender: s.senderWallet,
        receiver: s.receiverWallet,
        status: s.status,
        dispatchedAt: s.dispatchedAt?.toISOString(),
        deliveredAt: s.deliveredAt?.toISOString(),
      })),
      coldChainStatus: {
        ok: coldChainOk,
        logCount: coldChainLogs.length,
        lastTemperatureC: coldChainLogs[0]?.temperature,
        lastTimestamp: coldChainLogs[0]?.timestamp.toISOString(),
        notes: coldChainOk
          ? coldChainLogs.length === 0
            ? ["No cold-chain telemetry recorded for this shipment."]
            : ["All monitored hops remained within 2°C–8°C safe range."]
          : ["One or more cold-chain hops breached the 2°C–8°C safe window."],
      },
    },
  };
}
