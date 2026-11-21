CREATE TABLE "PrescriptionItem" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT,
    "billedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PrescriptionItem_quantity_check" CHECK (
      "durationDays" > 0 AND
      "quantity" > 0 AND
      "billedQuantity" >= 0 AND
      "billedQuantity" <= "quantity"
    )
);

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_clinicId_id_key" UNIQUE ("clinicId", "id");

CREATE INDEX "PrescriptionItem_clinicId_encounterId_createdAt_idx"
  ON "PrescriptionItem"("clinicId", "encounterId", "createdAt");
CREATE INDEX "PrescriptionItem_clinicId_medicineId_idx"
  ON "PrescriptionItem"("clinicId", "medicineId");

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_encounterId_fkey"
  FOREIGN KEY ("clinicId", "encounterId") REFERENCES "PatientEncounter"("clinicId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_medicineId_fkey"
  FOREIGN KEY ("clinicId", "medicineId") REFERENCES "Medicine"("clinicId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem"
  ADD COLUMN "prescriptionItemId" UUID,
  ADD COLUMN "prescriptionDosage" TEXT,
  ADD COLUMN "prescriptionFrequency" TEXT,
  ADD COLUMN "prescriptionDurationDays" INTEGER,
  ADD COLUMN "prescriptionInstructions" TEXT;

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_prescriptionItemId_fkey"
  FOREIGN KEY ("clinicId", "prescriptionItemId") REFERENCES "PrescriptionItem"("clinicId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InvoiceItem_clinicId_prescriptionItemId_idx"
  ON "InvoiceItem"("clinicId", "prescriptionItemId");
