-- CreateEnum
CREATE TYPE "InvoiceTemplate" AS ENUM ('PROFESSIONAL', 'DETAILED', 'THERMAL');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_nextInvoiceNumber_check" CHECK ("nextInvoiceNumber" > 0);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "template" "InvoiceTemplate" NOT NULL DEFAULT 'PROFESSIONAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "medicineId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "batchNumber" TEXT,
    "expiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "receivedById" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- AddConstraints
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_id_key" UNIQUE ("clinicId", "id");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_id_key" UNIQUE ("clinicId", "id");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_check"
CHECK (
    "subtotal" >= 0 AND
    "discount" >= 0 AND "discount" <= "subtotal" AND
    "taxRate" >= 0 AND "taxRate" <= 100 AND
    "taxAmount" >= 0 AND
    "total" = "subtotal" - "discount" + "taxAmount"
);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_amounts_check"
CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" = "quantity" * "unitPrice");
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_amount_check" CHECK ("amount" > 0);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clinicId_invoiceNumber_key" ON "Invoice"("clinicId", "invoiceNumber");
CREATE INDEX "Invoice_clinicId_invoiceDate_createdAt_idx" ON "Invoice"("clinicId", "invoiceDate", "createdAt");
CREATE INDEX "Invoice_clinicId_patientId_createdAt_idx" ON "Invoice"("clinicId", "patientId", "createdAt");
CREATE INDEX "InvoiceItem_clinicId_invoiceId_idx" ON "InvoiceItem"("clinicId", "invoiceId");
CREATE UNIQUE INDEX "InvoicePayment_clinicId_invoiceId_receiptNumber_key"
ON "InvoicePayment"("clinicId", "invoiceId", "receiptNumber");
CREATE INDEX "InvoicePayment_clinicId_paidAt_idx" ON "InvoicePayment"("clinicId", "paidAt");
CREATE INDEX "InvoicePayment_clinicId_invoiceId_paidAt_idx"
ON "InvoicePayment"("clinicId", "invoiceId", "paidAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey"
FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey"
FOREIGN KEY ("clinicId", "createdById") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
FOREIGN KEY ("clinicId", "invoiceId") REFERENCES "Invoice"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey"
FOREIGN KEY ("clinicId", "invoiceId") REFERENCES "Invoice"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_receivedById_fkey"
FOREIGN KEY ("clinicId", "receivedById") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
