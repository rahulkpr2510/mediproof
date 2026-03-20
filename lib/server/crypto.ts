import { keccak256, randomBytes, toUtf8Bytes } from "ethers";

function cleanHexPrefix(value: string) {
  return value.startsWith("0x") ? value.slice(2) : value;
}

export function toHash(...parts: Array<string | number>) {
  return keccak256(toUtf8Bytes(parts.map((v) => String(v)).join("|")));
}

export function buildBatchId(input: {
  medicineName: string;
  manufacturer: string;
  timestamp: number;
  randomSalt?: string;
  batchNumber: string;
}) {
  const salt = input.randomSalt ?? randomSalt();
  return toHash(
    input.medicineName,
    input.manufacturer.toLowerCase(),
    input.timestamp,
    salt,
    input.batchNumber,
  );
}

export function buildUnitId(
  batchId: string,
  serialNumber: number,
  salt: string,
) {
  return toHash(batchId, serialNumber, salt);
}

export function createQrChecksum(unitId: string, secretReference: string) {
  return toHash(unitId, secretReference).slice(0, 18);
}

export function createScanProof(
  unitId: string,
  secretReference: string,
  scanNonce: string,
) {
  return toHash(unitId, secretReference, scanNonce);
}

export function randomSalt(bytes = 16) {
  return `0x${Buffer.from(randomBytes(bytes)).toString("hex")}`;
}

export function normalizeAddress(address: string) {
  return `0x${cleanHexPrefix(address).toLowerCase()}`;
}
