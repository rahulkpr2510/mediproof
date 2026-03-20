import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Wallet, keccak256, randomBytes, toUtf8Bytes } from "ethers";

const prisma = new PrismaClient();

function toHash(...parts) {
  return keccak256(toUtf8Bytes(parts.map((v) => String(v)).join("|")));
}

function randomSalt(bytes = 8) {
  return `0x${Buffer.from(randomBytes(bytes)).toString("hex")}`;
}

function normalizeAddress(address) {
  const cleaned = address.startsWith("0x") ? address.slice(2) : address;
  return `0x${cleaned.toLowerCase()}`;
}

function createQrChecksum(unitId, secretReference) {
  return toHash(unitId, secretReference).slice(0, 18);
}

async function ensureRole(wallet, role) {
  await prisma.roleAssignment.upsert({
    where: { wallet },
    update: { role },
    create: { wallet, role },
  });
}

async function main() {
  const manufacturer = normalizeAddress(Wallet.createRandom().address);
  const distributor = normalizeAddress(Wallet.createRandom().address);
  const pharmacy = normalizeAddress(Wallet.createRandom().address);
  const buyer = normalizeAddress(Wallet.createRandom().address);

  await ensureRole(manufacturer, "MANUFACTURER");
  await ensureRole(distributor, "DISTRIBUTOR");
  await ensureRole(pharmacy, "PHARMACY");

  const medicineName = "Amoxicillin 500mg";
  const batchId = toHash(medicineName, manufacturer, Date.now(), randomSalt(), "B-2026-001");

  await prisma.batch.create({
    data: {
      batchId,
      medicineName,
      manufacturer,
      manufactureDate: new Date(),
      expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000),
      totalQuantity: 20,
      status: "ACTIVE",
    },
  });

  const units = Array.from({ length: 20 }).map((_, idx) => {
    const serialNumber = idx + 1;
    const secretReference = randomSalt(8);
    const unitId = toHash(batchId, serialNumber, randomSalt(8));
    return {
      unitId,
      batchId,
      serialNumber,
      secretReference,
      checksum: createQrChecksum(unitId, secretReference),
    };
  });

  await prisma.unit.createMany({ data: units });
  await prisma.supplyEvent.createMany({
    data: units.map((u) => ({
      unitId: u.unitId,
      eventType: "MANUFACTURED",
      actorWallet: manufacturer,
      senderConfirmed: true,
      receiverConfirmed: true,
    })),
  });

  const shipmentId = toHash(batchId, "shipment", Date.now(), randomSalt());
  const shipment = await prisma.shipment.create({
    data: {
      shipmentId,
      batchId,
      unitStart: 1,
      unitEnd: 20,
      senderWallet: manufacturer,
      receiverWallet: distributor,
      requestedBy: distributor,
      quantity: 20,
      status: "REQUESTED",
    },
  });

  await prisma.shipment.update({
    where: { shipmentId: shipment.shipmentId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await prisma.shipment.update({
    where: { shipmentId: shipment.shipmentId },
    data: { status: "DISPATCHED", dispatchedAt: new Date() },
  });

  await prisma.shipment.update({
    where: { shipmentId: shipment.shipmentId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  await prisma.supplyEvent.createMany({
    data: units.map((u) => ({
      unitId: u.unitId,
      shipmentId,
      eventType: "DISTRIBUTOR_RECEIVED",
      actorWallet: distributor,
      senderConfirmed: true,
      receiverConfirmed: true,
    })),
  });

  await prisma.coldChainLog.createMany({
    data: [
      { shipmentId, temperature: 5.4, location: "hub-a", safe: true },
      { shipmentId, temperature: 6.2, location: "hub-b", safe: true },
    ],
  });

  const halfShipmentId = toHash(batchId, "shipment-pharmacy", Date.now(), randomSalt());
  await prisma.shipment.create({
    data: {
      shipmentId: halfShipmentId,
      batchId,
      unitStart: 1,
      unitEnd: 10,
      senderWallet: distributor,
      receiverWallet: pharmacy,
      requestedBy: pharmacy,
      quantity: 10,
      status: "DELIVERED",
      approvedAt: new Date(),
      dispatchedAt: new Date(),
      deliveredAt: new Date(),
    },
  });

  await prisma.supplyEvent.createMany({
    data: units.slice(0, 10).map((u) => ({
      unitId: u.unitId,
      shipmentId: halfShipmentId,
      eventType: "PHARMACY_RECEIVED",
      actorWallet: pharmacy,
      senderConfirmed: true,
      receiverConfirmed: true,
    })),
  });

  const soldUnit = units[0];
  await prisma.finalSale.create({
    data: {
      unitId: soldUnit.unitId,
      batchId,
      pharmacyWallet: pharmacy,
      buyerWallet: buyer,
      pharmacySignature: "signed-by-pharmacy",
      buyerSignature: "signed-by-buyer",
    },
  });

  await prisma.unit.update({
    where: { unitId: soldUnit.unitId },
    data: { soldAt: new Date() },
  });

  await prisma.supplyEvent.create({
    data: {
      unitId: soldUnit.unitId,
      eventType: "SOLD",
      actorWallet: pharmacy,
      senderConfirmed: true,
      receiverConfirmed: true,
    },
  });

  const scanNonce = randomSalt(4);
  const proof = toHash(soldUnit.unitId, soldUnit.secretReference, scanNonce);
  await prisma.unit.update({
    where: { unitId: soldUnit.unitId },
    data: { qrNonceHash: proof },
  });

  const timeline = await prisma.supplyEvent.findMany({
    where: { unitId: soldUnit.unitId },
    orderBy: { timestamp: "asc" },
  });

  const coldChain = await prisma.coldChainLog.findMany({
    where: { shipmentId: { in: [shipmentId, halfShipmentId] } },
    orderBy: { timestamp: "desc" },
  });

  const verdict = coldChain.every((c) => c.safe) ? "GREEN" : "AMBER";

  await prisma.scanLog.create({
    data: {
      unitId: soldUnit.unitId,
      batchId,
      actorType: "PUBLIC",
      result: verdict,
      reasoning: ["Flow test verification completed."],
      lat: 19.07,
      lng: 72.88,
      deviceFingerprint: "flow-test-device",
      ip: "127.0.0.1",
    },
  });

  console.log("Full flow completed successfully");
  console.log({
    batchId,
    soldUnitId: soldUnit.unitId,
    verdict,
    timelineSteps: timeline.length,
    coldChainLogs: coldChain.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
