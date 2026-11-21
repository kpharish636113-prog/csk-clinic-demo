-- CreateEnum
CREATE TYPE "MedicineStockMovementType" AS ENUM ('RECEIVED', 'DISPENSED', 'ADJUSTED');

-- CreateTable
CREATE TABLE "Medicine" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "batchNumber" TEXT,
    "expiresAt" DATE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineStockMovement" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "MedicineStockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineStockMovement_pkey" PRIMARY KEY ("id")
);

-- AddConstraint
ALTER TABLE "Medicine"
ADD CONSTRAINT "Medicine_quantity_check" CHECK ("quantity" >= 0),
ADD CONSTRAINT "Medicine_reorderLevel_check" CHECK ("reorderLevel" >= 0),
ADD CONSTRAINT "Medicine_prices_check" CHECK ("purchasePrice" >= 0 AND "sellingPrice" >= 0);

-- AddConstraint
ALTER TABLE "MedicineStockMovement"
ADD CONSTRAINT "MedicineStockMovement_quantities_check"
CHECK ("quantityBefore" >= 0 AND "quantityAfter" >= 0 AND "quantityAfter" = "quantityBefore" + "quantityDelta");

-- CreateIndex
CREATE INDEX "Medicine_clinicId_name_idx" ON "Medicine"("clinicId", "name");
CREATE INDEX "Medicine_clinicId_active_idx" ON "Medicine"("clinicId", "active");
CREATE INDEX "Medicine_clinicId_expiresAt_idx" ON "Medicine"("clinicId", "expiresAt");
CREATE UNIQUE INDEX "Medicine_clinicId_id_key" ON "Medicine"("clinicId", "id");
CREATE UNIQUE INDEX "User_clinicId_id_key" ON "User"("clinicId", "id");
CREATE INDEX "MedicineStockMovement_clinicId_medicineId_createdAt_idx"
ON "MedicineStockMovement"("clinicId", "medicineId", "createdAt");

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineStockMovement" ADD CONSTRAINT "MedicineStockMovement_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineStockMovement" ADD CONSTRAINT "MedicineStockMovement_medicineId_fkey"
FOREIGN KEY ("clinicId", "medicineId") REFERENCES "Medicine"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineStockMovement" ADD CONSTRAINT "MedicineStockMovement_userId_fkey"
FOREIGN KEY ("clinicId", "userId") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
