ALTER TABLE "ConsumableStockMovement"
  ADD COLUMN "patientId" UUID,
  ADD COLUMN "encounterId" UUID,
  ADD COLUMN "invoiceId" UUID;

ALTER TABLE "InvoiceItem"
  ADD COLUMN "consumableId" UUID;
