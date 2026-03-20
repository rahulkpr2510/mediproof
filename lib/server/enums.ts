export const ROLE_TYPES = [
  "NONE",
  "ADMIN",
  "MANUFACTURER",
  "DISTRIBUTOR",
  "PHARMACY",
] as const;

export const BATCH_STATUS = [
  "ACTIVE",
  "RECALLED",
  "EXPIRED",
  "SUSPICIOUS",
] as const;
export const SHIPMENT_STATUS = [
  "REQUESTED",
  "APPROVED",
  "DISPATCHED",
  "DELIVERED",
] as const;
export const SUPPLY_EVENT_TYPES = [
  "MANUFACTURED",
  "DISTRIBUTOR_RECEIVED",
  "PHARMACY_RECEIVED",
  "SOLD",
] as const;
export const ACTOR_TYPES = [
  "PUBLIC",
  "MANUFACTURER",
  "DISTRIBUTOR",
  "PHARMACY",
  "ADMIN",
] as const;
export const VERIFICATION_RESULTS = ["GREEN", "AMBER", "RED"] as const;
export const ANOMALY_TYPES = [
  "GEO",
  "DUPLICATE",
  "PRE_SALE",
  "DEVICE",
  "SHIPMENT_MISMATCH",
  "UNAUTHORIZED",
] as const;
export const SEVERITY_LEVELS = ["INFO", "WARN", "CRITICAL"] as const;

export type RoleType = (typeof ROLE_TYPES)[number];
export type BatchStatus = (typeof BATCH_STATUS)[number];
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[number];
export type SupplyEventType = (typeof SUPPLY_EVENT_TYPES)[number];
export type ActorType = (typeof ACTOR_TYPES)[number];
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];
export type AnomalyType = (typeof ANOMALY_TYPES)[number];
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];
