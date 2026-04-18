-- CreateEnum for RoleType
CREATE TYPE "RoleType" AS ENUM ('NONE', 'ADMIN', 'MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY');

-- CreateEnum for UserStatus
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum for OrderStatus
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum for ReportStatus
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum for other statuses
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'RECALLED', 'EXPIRED', 'SUSPICIOUS');
CREATE TYPE "ShipmentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED');
CREATE TYPE "SupplyEventType" AS ENUM ('MANUFACTURED', 'DISTRIBUTOR_RECEIVED', 'PHARMACY_RECEIVED', 'SOLD');
CREATE TYPE "ActorType" AS ENUM ('PUBLIC', 'MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY', 'ADMIN');
CREATE TYPE "VerificationResult" AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE "AnomalyType" AS ENUM ('GEO', 'DUPLICATE', 'PRE_SALE', 'DEVICE', 'SHIPMENT_MISMATCH', 'UNAUTHORIZED');
CREATE TYPE "SeverityLevel" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wallet" VARCHAR(64),
    "role" "RoleType" NOT NULL DEFAULT 'NONE',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for User
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateTable Manufacturer
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Manufacturer_userId_key" ON "Manufacturer"("userId");
CREATE INDEX "Manufacturer_licenseNumber_idx" ON "Manufacturer"("licenseNumber");
ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- CreateTable Distributor
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "warehouseAddress" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Distributor_userId_key" ON "Distributor"("userId");
CREATE INDEX "Distributor_licenseNumber_idx" ON "Distributor"("licenseNumber");
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- CreateTable Pharmacy
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pharmacyName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pharmacy_userId_key" ON "Pharmacy"("userId");
CREATE INDEX "Pharmacy_licenseNumber_idx" ON "Pharmacy"("licenseNumber");
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- CreateTable ManufacturerStock
CREATE TABLE "ManufacturerStock" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManufacturerStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManufacturerStock_manufacturerId_batchId_key" ON "ManufacturerStock"("manufacturerId", "batchId");
CREATE INDEX "ManufacturerStock_batchId_idx" ON "ManufacturerStock"("batchId");
ALTER TABLE "ManufacturerStock" ADD CONSTRAINT "ManufacturerStock_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE;

-- CreateTable DistributorStock
CREATE TABLE "DistributorStock" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DistributorStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DistributorStock_distributorId_batchId_key" ON "DistributorStock"("distributorId", "batchId");
CREATE INDEX "DistributorStock_batchId_idx" ON "DistributorStock"("batchId");
ALTER TABLE "DistributorStock" ADD CONSTRAINT "DistributorStock_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE;

-- CreateTable PharmacyStock
CREATE TABLE "PharmacyStock" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PharmacyStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PharmacyStock_pharmacyId_batchId_key" ON "PharmacyStock"("pharmacyId", "batchId");
CREATE INDEX "PharmacyStock_batchId_idx" ON "PharmacyStock"("batchId");
ALTER TABLE "PharmacyStock" ADD CONSTRAINT "PharmacyStock_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE;

-- CreateTable StripCode
CREATE TABLE "StripCode" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "stripNumber" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripCode_unitId_stripNumber_key" ON "StripCode"("unitId", "stripNumber");
CREATE INDEX "StripCode_code_idx" ON "StripCode"("code");
CREATE INDEX "StripCode_batchId_idx" ON "StripCode"("batchId");

-- CreateTable ManualReport
CREATE TABLE "ManualReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "entityType" "RoleType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reporterName" TEXT,
    "reporterEmail" TEXT,
    "reporterPhone" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManualReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualReport_entityType_idx" ON "ManualReport"("entityType");
CREATE INDEX "ManualReport_status_idx" ON "ManualReport"("status");
CREATE INDEX "ManualReport_createdAt_idx" ON "ManualReport"("createdAt");
ALTER TABLE "ManualReport" ADD CONSTRAINT "ManualReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL;

-- CreateTable Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerRole" "RoleType" NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierRole" "RoleType" NOT NULL,
    "batchId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isSpecialOrder" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
CREATE INDEX "Order_supplierId_idx" ON "Order"("supplierId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
