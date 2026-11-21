ALTER TABLE "Clinic"
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "practitionerName" TEXT,
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "taxId" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "invoiceFooter" TEXT;
