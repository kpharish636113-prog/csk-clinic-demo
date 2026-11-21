CREATE TYPE "ConsumableStockMovementType" AS ENUM (
    'RECEIVED',
    'DISPENSED',
    'ADJUSTED',
    'DAMAGED',
    'EXPIRED'
);

ALTER TABLE "PatientEncounter"
ADD COLUMN "queueTokenId" UUID;

ALTER TABLE "Invoice"
ADD COLUMN "encounterId" UUID;

ALTER TABLE "Medicine"
ADD COLUMN "brand" TEXT,
ADD COLUMN "manufacturer" TEXT,
ADD COLUMN "productSize" TEXT,
ADD COLUMN "supplier" TEXT;

CREATE UNIQUE INDEX "PatientEncounter_clinicId_queueTokenId_key"
ON "PatientEncounter"("clinicId", "queueTokenId");

CREATE INDEX "Invoice_clinicId_encounterId_idx"
ON "Invoice"("clinicId", "encounterId");

CREATE TABLE "ConsumableCategory" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumableCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Consumable" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "manufacturer" TEXT,
    "productSize" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "batchNumber" TEXT,
    "expiresAt" DATE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "storageInstructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Consumable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumableStockMovement" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "consumableId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ConsumableStockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2),
    "supplier" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumableStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsumableCategory_clinicId_id_key"
ON "ConsumableCategory"("clinicId", "id");
CREATE UNIQUE INDEX "ConsumableCategory_clinicId_name_key"
ON "ConsumableCategory"("clinicId", "name");
CREATE INDEX "ConsumableCategory_clinicId_active_name_idx"
ON "ConsumableCategory"("clinicId", "active", "name");
CREATE UNIQUE INDEX "Consumable_clinicId_id_key"
ON "Consumable"("clinicId", "id");
CREATE INDEX "Consumable_clinicId_name_idx"
ON "Consumable"("clinicId", "name");
CREATE INDEX "Consumable_clinicId_categoryId_active_idx"
ON "Consumable"("clinicId", "categoryId", "active");
CREATE INDEX "Consumable_clinicId_expiresAt_idx"
ON "Consumable"("clinicId", "expiresAt");
CREATE INDEX "Consumable_clinicId_quantity_reorderLevel_idx"
ON "Consumable"("clinicId", "quantity", "reorderLevel");
CREATE INDEX "ConsumableStockMovement_clinicId_consumableId_createdAt_idx"
ON "ConsumableStockMovement"("clinicId", "consumableId", "createdAt");
CREATE INDEX "ConsumableStockMovement_clinicId_supplier_createdAt_idx"
ON "ConsumableStockMovement"("clinicId", "supplier", "createdAt");

ALTER TABLE "PatientEncounter"
ADD CONSTRAINT "PatientEncounter_clinicId_queueTokenId_fkey"
FOREIGN KEY ("clinicId", "queueTokenId") REFERENCES "QueueToken"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_clinicId_encounterId_fkey"
FOREIGN KEY ("clinicId", "encounterId") REFERENCES "PatientEncounter"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsumableCategory"
ADD CONSTRAINT "ConsumableCategory_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Consumable"
ADD CONSTRAINT "Consumable_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Consumable"
ADD CONSTRAINT "Consumable_clinicId_categoryId_fkey"
FOREIGN KEY ("clinicId", "categoryId") REFERENCES "ConsumableCategory"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsumableStockMovement"
ADD CONSTRAINT "ConsumableStockMovement_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsumableStockMovement"
ADD CONSTRAINT "ConsumableStockMovement_clinicId_consumableId_fkey"
FOREIGN KEY ("clinicId", "consumableId") REFERENCES "Consumable"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsumableStockMovement"
ADD CONSTRAINT "ConsumableStockMovement_clinicId_userId_fkey"
FOREIGN KEY ("clinicId", "userId") REFERENCES "User"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
