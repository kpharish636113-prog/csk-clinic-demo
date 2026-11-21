CREATE TABLE "PatientReport" (
  "id" UUID NOT NULL,
  "clinicId" UUID NOT NULL,
  "encounterId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "reportDate" DATE,
  "fileName" TEXT,
  "mimeType" TEXT,
  "fileDataUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientReport_clinicId_id_key" ON "PatientReport"("clinicId", "id");
CREATE INDEX "PatientReport_clinicId_encounterId_reportDate_idx" ON "PatientReport"("clinicId", "encounterId", "reportDate");

ALTER TABLE "PatientReport"
ADD CONSTRAINT "PatientReport_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientReport"
ADD CONSTRAINT "PatientReport_clinicId_encounterId_fkey"
FOREIGN KEY ("clinicId", "encounterId") REFERENCES "PatientEncounter"("clinicId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
