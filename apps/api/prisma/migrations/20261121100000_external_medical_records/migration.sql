CREATE TABLE "ExternalMedicalRecord" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "recordDate" DATE NOT NULL,
    "recordType" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "facilityName" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "medications" TEXT,
    "investigations" TEXT,
    "notes" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalMedicalRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalMedicalRecord_clinicId_id_key"
ON "ExternalMedicalRecord"("clinicId", "id");

CREATE INDEX "ExternalMedicalRecord_clinicId_patientId_recordDate_created_idx"
ON "ExternalMedicalRecord"("clinicId", "patientId", "recordDate", "createdAt");

ALTER TABLE "ExternalMedicalRecord"
ADD CONSTRAINT "ExternalMedicalRecord_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalMedicalRecord"
ADD CONSTRAINT "ExternalMedicalRecord_clinicId_patientId_fkey"
FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalMedicalRecord"
ADD CONSTRAINT "ExternalMedicalRecord_clinicId_createdById_fkey"
FOREIGN KEY ("clinicId", "createdById") REFERENCES "User"("clinicId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
