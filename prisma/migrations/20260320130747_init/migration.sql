-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('NONE', 'ADMIN', 'MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'RECALLED', 'EXPIRED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "SupplyEventType" AS ENUM ('MANUFACTURED', 'DISTRIBUTOR_RECEIVED', 'PHARMACY_RECEIVED', 'SOLD');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PUBLIC', 'MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('GEO', 'DUPLICATE', 'PRE_SALE', 'DEVICE', 'SHIPMENT_MISMATCH', 'UNAUTHORIZED');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "wallet" VARCHAR(64) NOT NULL,
    "role" "RoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "batchId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "manufacturer" VARCHAR(64) NOT NULL,
    "manufactureDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "blockchainAnchor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("batchId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "unitId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "serialNumber" INTEGER NOT NULL,
    "secretReference" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "qrNonceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("unitId")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "shipmentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "unitStart" INTEGER NOT NULL,
    "unitEnd" INTEGER NOT NULL,
    "senderWallet" VARCHAR(64) NOT NULL,
    "receiverWallet" VARCHAR(64) NOT NULL,
    "requestedBy" VARCHAR(64) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "blockchainAnchor" TEXT,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("shipmentId")
);

-- CreateTable
CREATE TABLE "SupplyEvent" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "eventType" "SupplyEventType" NOT NULL,
    "actorWallet" VARCHAR(64) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationHash" TEXT,
    "senderConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "receiverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "blockchainAnchor" TEXT,

    CONSTRAINT "SupplyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "deviceFingerprint" TEXT,
    "ip" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorWallet" TEXT,
    "result" "VerificationResult" NOT NULL,
    "reasoning" JSONB,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyEvent" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "severity" "SeverityLevel" NOT NULL,
    "details" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColdChainLog" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "safe" BOOLEAN NOT NULL,

    CONSTRAINT "ColdChainLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalSale" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "pharmacyWallet" VARCHAR(64) NOT NULL,
    "buyerWallet" VARCHAR(64) NOT NULL,
    "pharmacySignature" TEXT NOT NULL,
    "buyerSignature" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchainAnchor" TEXT,

    CONSTRAINT "FinalSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerReputationSnapshot" (
    "id" TEXT NOT NULL,
    "manufacturer" VARCHAR(64) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "anomalyRate" DOUBLE PRECISION NOT NULL,
    "successfulRate" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManufacturerReputationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_wallet_key" ON "RoleAssignment"("wallet");

-- CreateIndex
CREATE INDEX "RoleAssignment_role_idx" ON "RoleAssignment"("role");

-- CreateIndex
CREATE INDEX "Batch_manufacturer_idx" ON "Batch"("manufacturer");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Unit_batchId_idx" ON "Unit"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_batchId_serialNumber_key" ON "Unit"("batchId", "serialNumber");

-- CreateIndex
CREATE INDEX "Shipment_batchId_idx" ON "Shipment"("batchId");

-- CreateIndex
CREATE INDEX "Shipment_senderWallet_idx" ON "Shipment"("senderWallet");

-- CreateIndex
CREATE INDEX "Shipment_receiverWallet_idx" ON "Shipment"("receiverWallet");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "SupplyEvent_unitId_idx" ON "SupplyEvent"("unitId");

-- CreateIndex
CREATE INDEX "SupplyEvent_eventType_idx" ON "SupplyEvent"("eventType");

-- CreateIndex
CREATE INDEX "SupplyEvent_timestamp_idx" ON "SupplyEvent"("timestamp");

-- CreateIndex
CREATE INDEX "ScanLog_unitId_idx" ON "ScanLog"("unitId");

-- CreateIndex
CREATE INDEX "ScanLog_batchId_idx" ON "ScanLog"("batchId");

-- CreateIndex
CREATE INDEX "ScanLog_timestamp_idx" ON "ScanLog"("timestamp");

-- CreateIndex
CREATE INDEX "AnomalyEvent_unitId_idx" ON "AnomalyEvent"("unitId");

-- CreateIndex
CREATE INDEX "AnomalyEvent_type_idx" ON "AnomalyEvent"("type");

-- CreateIndex
CREATE INDEX "AnomalyEvent_detectedAt_idx" ON "AnomalyEvent"("detectedAt");

-- CreateIndex
CREATE INDEX "ColdChainLog_shipmentId_idx" ON "ColdChainLog"("shipmentId");

-- CreateIndex
CREATE INDEX "ColdChainLog_timestamp_idx" ON "ColdChainLog"("timestamp");

-- CreateIndex
CREATE INDEX "FinalSale_unitId_idx" ON "FinalSale"("unitId");

-- CreateIndex
CREATE INDEX "FinalSale_pharmacyWallet_idx" ON "FinalSale"("pharmacyWallet");

-- CreateIndex
CREATE INDEX "FinalSale_buyerWallet_idx" ON "FinalSale"("buyerWallet");

-- CreateIndex
CREATE INDEX "ManufacturerReputationSnapshot_manufacturer_idx" ON "ManufacturerReputationSnapshot"("manufacturer");

-- CreateIndex
CREATE INDEX "ManufacturerReputationSnapshot_computedAt_idx" ON "ManufacturerReputationSnapshot"("computedAt");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyEvent" ADD CONSTRAINT "SupplyEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColdChainLog" ADD CONSTRAINT "ColdChainLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("shipmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalSale" ADD CONSTRAINT "FinalSale_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalSale" ADD CONSTRAINT "FinalSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE RESTRICT ON UPDATE CASCADE;
