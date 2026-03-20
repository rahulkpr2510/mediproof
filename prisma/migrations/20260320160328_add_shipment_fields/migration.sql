/*
  Warnings:

  - You are about to drop the column `requestedBy` on the `Shipment` table. All the data in the column will be lost.
  - The `status` column on the `Shipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Shipment_batchId_idx";

-- DropIndex
DROP INDEX "Shipment_receiverWallet_idx";

-- DropIndex
DROP INDEX "Shipment_senderWallet_idx";

-- DropIndex
DROP INDEX "Shipment_status_idx";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "requestedBy",
ALTER COLUMN "senderWallet" SET DATA TYPE TEXT,
ALTER COLUMN "receiverWallet" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'REQUESTED';
