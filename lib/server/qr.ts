import { createQrChecksum, createScanProof } from "@/lib/server/crypto";

export interface QrPayload {
  unitId: string;
  secretReference: string;
  checksum: string;
}

export function buildQrPayload(
  unitId: string,
  secretReference: string,
): QrPayload {
  return {
    unitId,
    secretReference,
    checksum: createQrChecksum(unitId, secretReference),
  };
}

export function validateQrPayload(payload: QrPayload) {
  const expected = createQrChecksum(payload.unitId, payload.secretReference);
  return expected === payload.checksum;
}

export function createVerificationHash(
  unitId: string,
  secretReference: string,
  scanNonce: string,
) {
  return createScanProof(unitId, secretReference, scanNonce);
}
