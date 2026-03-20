import { ethers } from "ethers";

// ─── Provider singleton ───────────────────────────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (_provider) return _provider;

  const rpcUrl = process.env.SERVER_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      "SERVER_RPC_URL is not set in .env. " +
        "Set it to http://127.0.0.1:8545 for local Hardhat.",
    );
  }

  _provider = new ethers.JsonRpcProvider(rpcUrl);
  return _provider;
}

function getSigner(): ethers.Wallet {
  if (_signer) return _signer;

  const pk = process.env.SERVER_SIGNER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "SERVER_SIGNER_PRIVATE_KEY is not set in .env. " +
        "Use any Hardhat account private key for local testing.",
    );
  }

  _signer = new ethers.Wallet(pk, getProvider());
  return _signer;
}

// ─── Contract ABIs (minimal — only functions you call) ────────────────────────
const ROLE_MANAGER_ABI = [
  "function assignRole(address wallet, uint8 role) external",
  "function getRole(address wallet) external view returns (uint8)",
  "function revokeRole(address wallet) external",
];

const BATCH_REGISTRY_ABI = [
  "function registerBatch(string batchId, string medicineName, uint256 mfgDate, uint256 expDate, uint256 qty) external returns (bytes32)",
  "function serializeUnit(string batchId, string unitId, uint256 serial) external",
];

const SHIPMENT_LEDGER_ABI = [
  "function recordShipment(string shipmentId, string batchId, address sender, address receiver) external",
  "function confirmDelivery(string shipmentId) external",
];

const SALE_REGISTRY_ABI = [
  "function finalizeSale(string unitId, address buyer, bytes calldata pharmSig, bytes calldata buyerSig) external returns (bytes32)",
];

// ─── Contract getters ─────────────────────────────────────────────────────────
function getRoleManagerContract() {
  const addr = process.env.ROLE_MANAGER_ADDRESS;
  if (!addr) throw new Error("ROLE_MANAGER_ADDRESS not set in .env");
  return new ethers.Contract(addr, ROLE_MANAGER_ABI, getSigner());
}

function getBatchRegistryContract() {
  const addr = process.env.BATCH_REGISTRY_ADDRESS;
  if (!addr) throw new Error("BATCH_REGISTRY_ADDRESS not set in .env");
  return new ethers.Contract(addr, BATCH_REGISTRY_ABI, getSigner());
}

function getShipmentLedgerContract() {
  const addr = process.env.SHIPMENT_LEDGER_ADDRESS;
  if (!addr) throw new Error("SHIPMENT_LEDGER_ADDRESS not set in .env");
  return new ethers.Contract(addr, SHIPMENT_LEDGER_ABI, getSigner());
}

function getSaleRegistryContract() {
  const addr = process.env.SALE_REGISTRY_ADDRESS;
  if (!addr) throw new Error("SALE_REGISTRY_ADDRESS not set in .env");
  return new ethers.Contract(addr, SALE_REGISTRY_ABI, getSigner());
}

// ─── Role mapping ─────────────────────────────────────────────────────────────
const ROLE_TO_UINT: Record<string, number> = {
  NONE: 0,
  ADMIN: 1,
  MANUFACTURER: 2,
  DISTRIBUTOR: 3,
  PHARMACY: 4,
};

const UINT_TO_ROLE: Record<number, string> = {
  0: "NONE",
  1: "ADMIN",
  2: "MANUFACTURER",
  3: "DISTRIBUTOR",
  4: "PHARMACY",
};

// ─── Exported chain functions ─────────────────────────────────────────────────

export async function chainGetRole(wallet: string): Promise<string> {
  try {
    const contract = getRoleManagerContract();
    const result = (await contract.getRole(wallet)) as bigint;
    return UINT_TO_ROLE[Number(result)] ?? "NONE";
  } catch (err) {
    console.error("[blockchain] chainGetRole failed:", err);
    return "NONE";
  }
}

export async function chainAssignRole(
  wallet: string,
  role: string,
): Promise<string> {
  const contract = getRoleManagerContract();
  const roleUint = ROLE_TO_UINT[role] ?? 0;
  const tx = (await contract.assignRole(
    wallet,
    roleUint,
  )) as ethers.TransactionResponse;
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function chainRevokeRole(wallet: string): Promise<string> {
  const contract = getRoleManagerContract();
  const tx = (await contract.revokeRole(wallet)) as ethers.TransactionResponse;
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function chainRegisterBatch(params: {
  batchId: string;
  medicineName: string;
  manufactureDateUnix: number;
  expiryDateUnix: number;
  totalQuantity: number;
}): Promise<string> {
  try {
    const contract = getBatchRegistryContract();
    const tx = (await contract.registerBatch(
      params.batchId,
      params.medicineName,
      params.manufactureDateUnix,
      params.expiryDateUnix,
      params.totalQuantity,
    )) as ethers.TransactionResponse;
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (err) {
    console.error("[blockchain] chainRegisterBatch failed:", err);
    return "";
  }
}

export async function chainSerializeUnit(
  batchId: string,
  unitId: string,
  serialNumber: number,
): Promise<void> {
  try {
    const contract = getBatchRegistryContract();
    const tx = (await contract.serializeUnit(
      batchId,
      unitId,
      serialNumber,
    )) as ethers.TransactionResponse;
    await tx.wait();
  } catch (err) {
    console.error(
      `[blockchain] chainSerializeUnit #${serialNumber} failed:`,
      err,
    );
  }
}

export async function chainRecordShipment(
  shipmentId: string,
  batchId: string,
  sender: string,
  receiver: string,
): Promise<string> {
  try {
    const contract = getShipmentLedgerContract();
    const tx = (await contract.recordShipment(
      shipmentId,
      batchId,
      sender,
      receiver,
    )) as ethers.TransactionResponse;
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (err) {
    console.error("[blockchain] chainRecordShipment failed:", err);
    return "";
  }
}

export async function chainConfirmDelivery(
  shipmentId: string,
): Promise<string> {
  try {
    const contract = getShipmentLedgerContract();
    const tx = (await contract.confirmDelivery(
      shipmentId,
    )) as ethers.TransactionResponse;
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (err) {
    console.error("[blockchain] chainConfirmDelivery failed:", err);
    return "";
  }
}

export async function chainFinalizeSale(
  unitId: string,
  buyerWallet: string,
  pharmacySignature: string,
  buyerSignature: string,
): Promise<string> {
  try {
    const contract = getSaleRegistryContract();
    const tx = (await contract.finalizeSale(
      unitId,
      buyerWallet,
      pharmacySignature,
      buyerSignature,
    )) as ethers.TransactionResponse;
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (err) {
    console.error("[blockchain] chainFinalizeSale failed:", err);
    return "";
  }
}

// ─── Health check — use this to verify connectivity ───────────────────────────
export async function chainHealthCheck(): Promise<{
  ok: boolean;
  chainId?: number;
  blockNumber?: number;
  error?: string;
}> {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    return {
      ok: true,
      chainId: Number(network.chainId),
      blockNumber,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
