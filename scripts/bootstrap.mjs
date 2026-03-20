import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roleAbi = [
  "function assignRole(address account, uint8 role)",
  "function getRole(address account) view returns (uint8)",
];

const ROLE_CODE = {
  MANUFACTURER: 1,
  DISTRIBUTOR: 2,
  PHARMACY: 3,
  ADMIN: 4,
};

function normalizeAddress(address) {
  if (!address) return null;
  const cleaned = address.startsWith("0x") ? address.slice(2) : address;
  return `0x${cleaned.toLowerCase()}`;
}

function parseWalletList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => normalizeAddress(v.trim()))
    .filter(Boolean);
}

async function maybeAssignOnChain(address, role) {
  const rpcUrl = process.env.SERVER_RPC_URL;
  const privateKey = process.env.SERVER_SIGNER_PRIVATE_KEY;
  const roleManagerAddress = process.env.ROLE_MANAGER_ADDRESS;

  if (!rpcUrl || !privateKey || !roleManagerAddress) return;

  const signer = new Wallet(privateKey, new JsonRpcProvider(rpcUrl));
  const roleManager = new Contract(roleManagerAddress, roleAbi, signer);
  const current = Number(await roleManager.getRole(address));
  if (current === ROLE_CODE[role]) return;

  const tx = await roleManager.assignRole(address, ROLE_CODE[role]);
  await tx.wait();
}

async function bootstrap() {
  const adminWallet = normalizeAddress(process.env.ADMIN_WALLET);
  if (!adminWallet) {
    throw new Error("ADMIN_WALLET is required in .env");
  }

  const manufacturers = parseWalletList(process.env.SAMPLE_MANUFACTURERS);
  const distributors = parseWalletList(process.env.SAMPLE_DISTRIBUTORS);
  const pharmacies = parseWalletList(process.env.SAMPLE_PHARMACIES);

  const upserts = [
    { wallet: adminWallet, role: "ADMIN" },
    ...manufacturers.map((wallet) => ({ wallet, role: "MANUFACTURER" })),
    ...distributors.map((wallet) => ({ wallet, role: "DISTRIBUTOR" })),
    ...pharmacies.map((wallet) => ({ wallet, role: "PHARMACY" })),
  ];

  for (const item of upserts) {
    await prisma.roleAssignment.upsert({
      where: { wallet: item.wallet },
      update: { role: item.role },
      create: { wallet: item.wallet, role: item.role },
    });

    if (item.role !== "NONE") {
      await maybeAssignOnChain(item.wallet, item.role);
    }
  }

  console.log("Bootstrap complete");
  console.log({
    adminWallet,
    manufacturers,
    distributors,
    pharmacies,
    count: upserts.length,
  });
}

bootstrap()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
