import { prisma } from "@/lib/prisma";

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export async function getManufacturerReputation(manufacturer: string) {
  // Return cached snapshot if computed in last 10 minutes
  const recent = await prisma.manufacturerReputationSnapshot.findFirst({
    where: {
      manufacturer,
      computedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
    orderBy: { computedAt: "desc" },
  });
  if (recent) {
    return { manufacturer, score: recent.score, breakdown: recent.breakdown };
  }
  return computeManufacturerReputation(manufacturer);
}

export async function computeManufacturerReputation(manufacturer: string) {
  const [batches, anomalies, deliveredShipments, totalShipments] =
    await Promise.all([
      prisma.batch.findMany({ where: { manufacturer } }),
      prisma.anomalyEvent.findMany({
        where: { unit: { batch: { manufacturer } } },
      }),
      prisma.shipment.count({
        where: { batch: { manufacturer }, status: "DELIVERED" },
      }),
      prisma.shipment.count({ where: { batch: { manufacturer } } }),
    ]);

  const batchCount = Math.max(1, batches.length);
  const recallCount = batches.filter(
    (b: { status: string }) => b.status === "RECALLED",
  ).length;
  const suspiciousCount = batches.filter(
    (b: { status: string }) => b.status === "SUSPICIOUS",
  ).length;
  const expiryFailureCount = batches.filter(
    (b: { status: string }) => b.status === "EXPIRED",
  ).length;
  const criticalAnomalies = anomalies.filter(
    (a: { severity: string }) => a.severity === "CRITICAL",
  ).length;
  const anomalyRate = anomalies.length / batchCount;
  const shipmentBase = Math.max(1, totalShipments);
  const successfulRate = deliveredShipments / shipmentBase;

  const score = clamp(
    100 -
      criticalAnomalies * 8 -
      recallCount * 6 -
      expiryFailureCount * 5 -
      suspiciousCount * 4 -
      anomalyRate * 3 +
      successfulRate * 10,
  );

  const breakdown = [
    {
      label: "Counterfeit incidents",
      score: clamp(100 - criticalAnomalies * 10),
      weight: 0.3,
      explanation: `${criticalAnomalies} critical anomaly incidents detected`,
    },
    {
      label: "Recalls and suspicious batches",
      score: clamp(100 - (recallCount + suspiciousCount) * 8),
      weight: 0.25,
      explanation: `${recallCount} recalled, ${suspiciousCount} suspicious`,
    },
    {
      label: "Expiry compliance",
      score: clamp(100 - expiryFailureCount * 12),
      weight: 0.2,
      explanation: `${expiryFailureCount} expiry-related failures`,
    },
    {
      label: "Anomaly density",
      score: clamp(100 - anomalyRate * 10),
      weight: 0.15,
      explanation: `${anomalyRate.toFixed(2)} anomalies per batch`,
    },
    {
      label: "Delivery reliability",
      score: clamp(successfulRate * 100),
      weight: 0.1,
      explanation: `${deliveredShipments} delivered shipments across ${totalShipments} total shipments`,
    },
  ];

  await prisma.manufacturerReputationSnapshot.create({
    data: { manufacturer, score, breakdown, anomalyRate, successfulRate },
  });

  return { manufacturer, score, breakdown };
}
