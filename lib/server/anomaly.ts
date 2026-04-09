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

type ScanSample = {
  timestamp: Date;
  lat: number | null;
  lng: number | null;
  deviceFingerprint: string | null;
};

type SupplyEventSample = {
  eventType: string;
};

type ShipmentRange = {
  unitStart: number;
  unitEnd: number;
};

export async function evaluateAnomalies(
  input: AnomalyInput,
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const now = Date.now();
  const oneHourAgo = new Date(now - 3_600_000);
  const twentyFourHoursAgo = new Date(now - 86_400_000);

  const [unit, recentScans, supplyEvents, shipments, roleRecord] =
    await Promise.all([
      prisma.unit.findUnique({
        where: { unitId: input.unitId },
        select: { serialNumber: true, soldAt: true },
      }),
      // Fetch last 50 scans so we can slice by time window below
      prisma.scanLog.findMany({
        where: { unitId: input.unitId },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),
      prisma.supplyEvent.findMany({
        where: { unitId: input.unitId },
        orderBy: { timestamp: "asc" },
      }),
      prisma.shipment.findMany({ where: { batchId: input.batchId } }),
      input.actorWallet
        ? prisma.roleAssignment.findUnique({
            where: { wallet: input.actorWallet.toLowerCase() },
          })
        : Promise.resolve(null),
    ]);

  const scans: ScanSample[] = recentScans;
  const supplyChainEvents: SupplyEventSample[] = supplyEvents;
  const shipmentRanges: ShipmentRange[] = shipments;

  // ── Rule 1: UNAUTHORIZED actor ──────────────────────────────────────────────
  //
  // Fire when:
  //   (a) actorType is not PUBLIC and no role record exists for the wallet, OR
  //   (b) a wallet is provided, a role record exists, but the recorded role
  //       does not match the claimed actorType (role impersonation).
  //
  if (input.actorWallet) {
    if (!roleRecord) {
      // Wallet supplied but has no role assigned at all
      anomalies.push({
        type: "UNAUTHORIZED",
        severity: "CRITICAL",
        details: {
          actorWallet: input.actorWallet,
          claimedType: input.actorType,
          reason: "wallet_has_no_role",
        },
      });
    } else if (
      input.actorType !== "PUBLIC" &&
      roleRecord.role !== input.actorType
    ) {
      // Wallet has a role but is claiming a different one (impersonation)
      anomalies.push({
        type: "UNAUTHORIZED",
        severity: "CRITICAL",
        details: {
          actorWallet: input.actorWallet,
          claimedType: input.actorType,
          recordedRole: roleRecord.role,
          reason: "role_mismatch",
        },
      });
    }
  } else if (!roleRecord && input.actorType !== "PUBLIC") {
    // No wallet supplied but a privileged actor type was claimed
    anomalies.push({
      type: "UNAUTHORIZED",
      severity: "CRITICAL",
      details: { actorWallet: null, claimedType: input.actorType },
    });
  }

  // ── Rule 2: DUPLICATE scan flood ────────────────────────────────────────────
  //
  // Use time-windowed counts instead of plain tail count:
  //   - 1-hour window: ≥5 → WARN, ≥10 → CRITICAL
  //   - 24-hour window: ≥20 → CRITICAL (slow flood catch)
  //
  const scansIn1h = scans.filter((s) => s.timestamp >= oneHourAgo).length;
  const scansIn24h = scans.filter(
    (s) => s.timestamp >= twentyFourHoursAgo,
  ).length;

  if (scansIn1h >= 10 || scansIn24h >= 20) {
    anomalies.push({
      type: "DUPLICATE",
      severity: "CRITICAL",
      details: {
        scansInLastHour: scansIn1h,
        scansInLast24h: scansIn24h,
        reason: scansIn24h >= 20 ? "slow_flood_24h" : "rapid_flood_1h",
      },
    });
  } else if (scansIn1h >= 5) {
    anomalies.push({
      type: "DUPLICATE",
      severity: "WARN",
      details: {
        scansInLastHour: scansIn1h,
        scansInLast24h: scansIn24h,
        reason: "elevated_scan_frequency",
      },
    });
  }

  // ── Rule 3: DEVICE anomaly ──────────────────────────────────────────────────
  //
  // Count distinct device fingerprints within 1-hour window.
  //   ≥3 distinct → WARN (unusual)
  //   ≥6 distinct → CRITICAL (coordinated clone distribution)
  //
  // Also flag if this scan has no fingerprint but the unit has seen high
  // traffic in the last hour (could be deliberate evasion).
  //
  const recentScansIn1h = scans.filter((s) => s.timestamp >= oneHourAgo);
  const distinctDevices1h = new Set(
    recentScansIn1h
      .map((s) => s.deviceFingerprint)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  ).size;

  if (distinctDevices1h >= 6) {
    anomalies.push({
      type: "DEVICE",
      severity: "CRITICAL",
      details: {
        distinctDevicesInLastHour: distinctDevices1h,
        reason: "coordinated_multi_device_scanning",
      },
    });
  } else if (distinctDevices1h >= 3) {
    anomalies.push({
      type: "DEVICE",
      severity: "WARN",
      details: {
        distinctDevicesInLastHour: distinctDevices1h,
        reason: "multiple_devices_same_unit",
      },
    });
  }

  // Missing fingerprint in high-traffic window → potential evasion
  if (!input.deviceFingerprint && recentScansIn1h.length >= 3) {
    anomalies.push({
      type: "DEVICE",
      severity: "WARN",
      details: {
        scansInLastHour: recentScansIn1h.length,
        reason: "missing_fingerprint_high_traffic",
      },
    });
  }

  // ── Rule 4: GEO anomaly — physically impossible travel ──────────────────────
  //
  // Previous threshold: >900 km/h (commercial jet speed — too permissive).
  // New thresholds:
  //   >500 km/h → CRITICAL (no ground/rail transport reaches this)
  //   >200 km/h → WARN    (suspiciously fast, possible legitimate air courier)
  //
  const lastScanWithGeo = scans.find((s) => s.lat != null && s.lng != null);
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
      (now - lastScanWithGeo.timestamp.getTime()) / 3_600_000,
    );
    const speedKmh = km / hours;

    if (speedKmh > 500) {
      anomalies.push({
        type: "GEO",
        severity: "CRITICAL",
        details: {
          distanceKm: km.toFixed(1),
          timeHours: hours.toFixed(2),
          speedKmh: speedKmh.toFixed(0),
          transportImplication: "impossible_by_any_ground_transport",
        },
      });
    } else if (speedKmh > 200) {
      anomalies.push({
        type: "GEO",
        severity: "WARN",
        details: {
          distanceKm: km.toFixed(1),
          timeHours: hours.toFixed(2),
          speedKmh: speedKmh.toFixed(0),
          transportImplication: "suspicious_speed_possible_air_courier",
        },
      });
    }
  }

  // ── Rule 5: PRE_SALE — public scan before pharmacy custody ──────────────────
  //
  // Differentiated by supply-chain progress:
  //   No supply events at all → CRITICAL (phantom/clone — never registered in chain)
  //   Only MANUFACTURED event  → CRITICAL (unit hasn't left factory)
  //   DISTRIBUTOR_RECEIVED but not PHARMACY_RECEIVED → WARN (in-transit; less severe)
  //
  if (input.actorType === "PUBLIC") {
    const hasPharmacyReceived = supplyChainEvents.some(
      (e) => e.eventType === "PHARMACY_RECEIVED",
    );
    if (!hasPharmacyReceived) {
      const eventTypes = supplyChainEvents.map((e) => e.eventType);
      const hasDistributorReceived = eventTypes.includes(
        "DISTRIBUTOR_RECEIVED",
      );
      const hasManufactured = eventTypes.includes("MANUFACTURED");

      if (!hasManufactured) {
        // No events at all — very suspicious (clone or phantom unit)
        anomalies.push({
          type: "PRE_SALE",
          severity: "CRITICAL",
          details: {
            chainProgress: "none",
            reason: "unit_has_no_supply_chain_events",
          },
        });
      } else if (!hasDistributorReceived) {
        // Still at manufacturer — should never be in public hands
        anomalies.push({
          type: "PRE_SALE",
          severity: "CRITICAL",
          details: {
            chainProgress: "manufactured",
            reason: "unit_not_yet_left_manufacturer",
          },
        });
      } else {
        // In transit between distributor and pharmacy — lower severity
        anomalies.push({
          type: "PRE_SALE",
          severity: "WARN",
          details: {
            chainProgress: "in_transit",
            reason: "unit_in_transit_not_yet_at_pharmacy",
          },
        });
      }
    }
  }

  // ── Rule 6: SHIPMENT_MISMATCH ───────────────────────────────────────────────
  //
  // Previous: only checked serial-range membership, was WARN only.
  // New:
  //   Unit batch has never been shipped at all → CRITICAL
  //     (unit should not exist in public/supply-chain hands)
  //   Unit exists, shipments exist, but serial is outside all ranges → CRITICAL
  //     (strong counterfeit signal — serial was tampered or cloned)
  //
  if (unit) {
    if (shipments.length === 0) {
      anomalies.push({
        type: "SHIPMENT_MISMATCH",
        severity: "CRITICAL",
        details: {
          serialNumber: unit.serialNumber,
          reason: "unit_batch_never_shipped",
        },
      });
    } else {
      const inRange = shipmentRanges.some(
        (s) =>
          unit.serialNumber >= s.unitStart && unit.serialNumber <= s.unitEnd,
      );
      if (!inRange) {
        anomalies.push({
          type: "SHIPMENT_MISMATCH",
          severity: "CRITICAL",
          details: {
            serialNumber: unit.serialNumber,
            testedRanges: shipmentRanges.length,
            reason: "serial_outside_all_shipment_ranges",
          },
        });
      }
    }
  }

  // Persist all detected anomalies
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
