export type Role =
  | "NONE"
  | "ADMIN"
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "PHARMACY"
  | "UNKNOWN";

export type BatchStatus = "ACTIVE" | "RECALLED" | "EXPIRED" | "SUSPICIOUS";
export type ShipmentStatus =
  | "REQUESTED"
  | "APPROVED"
  | "DISPATCHED"
  | "DELIVERED";
export type VerificationVerdict = "GREEN" | "AMBER" | "RED";
export type AnomalyType =
  | "GEO"
  | "DUPLICATE"
  | "PRE_SALE"
  | "DEVICE"
  | "SHIPMENT_MISMATCH"
  | "UNAUTHORIZED";
export type SeverityLevel = "INFO" | "WARN" | "CRITICAL";

export interface Batch {
  batchId: string;
  medicineName: string;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  totalQuantity: number;
  status: BatchStatus;
  blockchainAnchor?: string | null;
  createdAt?: string;
}

export interface Shipment {
  shipmentId: string;
  batchId: string;
  unitStart: number;
  unitEnd: number;
  senderWallet: string;
  receiverWallet: string;
  quantity: number;
  status: ShipmentStatus;
  requestedAt?: string;
  approvedAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
}

export interface ColdChainLog {
  id: string;
  shipmentId: string;
  temperature: number;
  timestamp: string;
  location?: string | null;
  safe: boolean;
}

export interface AnomalyEvent {
  id: string;
  unitId: string;
  type: AnomalyType;
  severity: SeverityLevel;
  details: Record<string, unknown>;
  detectedAt: string;
}

export interface ScanLog {
  id: string;
  unitId: string;
  batchId: string;
  timestamp: string;
  actorType: string;
  result: VerificationVerdict;
  reasoning?: unknown;
}

export interface FinalSale {
  id: string;
  unitId: string;
  batchId: string;
  pharmacyWallet: string;
  buyerWallet: string;
  timestamp: string;
  blockchainAnchor?: string | null;
}

export interface UnitVerificationPayload {
  unitId: string;
  secretReference: string;
  checksum: string;
}

export interface VerificationResult {
  unitId: string;
  batchId: string;
  medicineName: string;
  medicineInfo?: {
    uses: string[];
    sideEffects: string[];
    disclaimer: string;
    source: string;
  };
  manufactureDate?: string;
  expiryDate?: string;
  batchStatus?: BatchStatus;
  verdict: VerificationVerdict;
  verdictReasoning: string[];
  timeline: Array<{
    label: string;
    actor: string;
    timestamp: string;
    locationHash?: string;
  }>;
  shipmentHistory: Array<{
    shipmentId: string;
    sender: string;
    receiver: string;
    status: ShipmentStatus;
    dispatchedAt?: string;
    deliveredAt?: string;
  }>;
  coldChainStatus: {
    ok: boolean;
    logCount?: number;
    lastTemperatureC?: number;
    lastTimestamp?: string;
    notes: string[];
  };
}

export interface ManufacturerReputation {
  manufacturer: string;
  score: number;
  breakdown: Array<{
    label: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
}
