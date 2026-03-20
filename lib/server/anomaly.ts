import { prisma } from "@/lib/prisma";
import { ActorType, AnomalyType, SeverityLevel } from "@/lib/server/enums";
import type { Prisma } from "@prisma/client";

const EARTH_RADIUS_KM = 6371;

function toRadians(v: number) {
  return (v * Math.PI) / 180;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface AnomalyInput {
  unitId: string;
  batchId: string;
  lat?: number;
  lng?: number;
  deviceFingerprint?: string;
  actorType: ActorType;
  actorWallet?: string;
}

interface DetectedAnomaly {
  type: AnomalyType;
  severity: SeverityLevel;
  details: Prisma.InputJsonValue;
}

export async function evaluateAnomalies(
  input: AnomalyInput,
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const [unit, recentScans, supplyEvents, shipments, roleRecord] =
    await Promise.all([
      prisma.unit.findUnique({
        where: { unitId: input.unitId },
        select: { serialNumber: true, soldAt: true },
      }),
      prisma.scanLog.findMany({
        where: { unitId: input.unitId },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
      prisma.supplyEvent.findMany({
        where: { unitId: input.unitId },
        orderBy: { timestamp: "desc" },
      }),
      prisma.shipment.findMany({ where: { batchId: input.batchId } }),
      input.actorWallet
        ? prisma.roleAssignment.findUnique({
            where: { wallet: input.actorWallet.toLowerCase() },
          })
        : Promise.resolve(null),
    ]);

  // 1. Unauthorized actor
  if (!roleRecord && input.actorType !== "PUBLIC") {
    anomalies.push({
      type: "UNAUTHORIZED",
      severity: "CRITICAL",
      details: { actorWallet: input.actorWallet, claimedType: input.actorType },
    });
  }

  // 2. Duplicate scan flood
  if (recentScans.length >= 5) {
    anomalies.push({
      type: "DUPLICATE",
      severity: recentScans.length >= 10 ? "CRITICAL" : "WARN",
      details: { recentScanCount: recentScans.length },
    });
  }

  // 3. Device anomaly — many distinct devices scanning same unit
  const distinctDevices = new Set(
    recentScans
      .map((s) => s.deviceFingerprint)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  ).size;
  if (distinctDevices >= 4) {
    anomalies.push({
      type: "DEVICE",
      severity: "WARN",
      details: { distinctDeviceCount: distinctDevices },
    });
  }

  // 4. Geo anomaly — physically impossible travel speed
  const lastScanWithGeo = recentScans.find(
    (s) => s.lat != null && s.lng != null,
  );
  if (
    input.lat != null &&
    input.lng != null &&
    lastScanWithGeo?.lat != null &&
    lastScanWithGeo?.lng != null
  ) {
    const km = distanceKm(
      input.lat,
      input.lng,
      lastScanWithGeo.lat,
      lastScanWithGeo.lng,
    );
    const hours = Math.max(
      0.01,
      (Date.now() - lastScanWithGeo.timestamp.getTime()) / 3_600_000,
    );
    const speedKmh = km / hours;
    if (speedKmh > 900) {
      anomalies.push({
        type: "GEO",
        severity: "CRITICAL",
        details: {
          distanceKm: km.toFixed(1),
          timeHours: hours.toFixed(2),
          speedKmh: speedKmh.toFixed(0),
        },
      });
    }
  }

  // 5. Pre-sale scan — public scan before unit reached pharmacy
  const hasPharmacyReceived = supplyEvents.some(
    (e: { eventType: string }) => e.eventType === "PHARMACY_RECEIVED",
  );
  if (!hasPharmacyReceived && input.actorType === "PUBLIC") {
    anomalies.push({
      type: "PRE_SALE",
      severity: "CRITICAL",
      details: { reason: "Public scan attempted before unit reached pharmacy" },
    });
  }

  // 6. Shipment range mismatch
  if (unit && shipments.length > 0) {
    const inRange = shipments.some(
      (s: { unitStart: number; unitEnd: number }) =>
        unit.serialNumber >= s.unitStart && unit.serialNumber <= s.unitEnd,
    );
    if (!inRange) {
      anomalies.push({
        type: "SHIPMENT_MISMATCH",
        severity: "WARN",
        details: {
          serialNumber: unit.serialNumber,
          availableShipments: shipments.length,
        },
      });
    }
  }

  if (anomalies.length > 0) {
    await prisma.anomalyEvent.createMany({
      data: anomalies.map((a) => ({
        unitId: input.unitId,
        type: a.type,
        severity: a.severity,
        details: a.details,
      })),
    });
  }

  return anomalies;
}
