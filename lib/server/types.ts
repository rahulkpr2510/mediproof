import {
  ActorType,
  BatchStatus,
  RoleType,
  ShipmentStatus,
  VerificationResult,
} from "@/lib/server/enums";

export type TrustVerdict = VerificationResult;

export interface VerificationContext {
  unitId: string;
  actorType: ActorType;
  actorWallet?: string;
  lat?: number;
  lng?: number;
  deviceFingerprint?: string;
  ip?: string;
}

export interface VerdictPayload {
  verdict: TrustVerdict;
  reasoning: string[];
  batchStatus: BatchStatus;
  anomalyTypes: string[];
  shipmentStatus?: ShipmentStatus;
}

export interface RoleResponse {
  role: RoleType;
}
