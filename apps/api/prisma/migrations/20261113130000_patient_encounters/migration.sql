CREATE TYPE "EncounterType" AS ENUM ('OPD', 'IPD');
CREATE TYPE "EncounterStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "PatientEncounter" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "encounterType" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'OPEN',
    "visitDate" DATE NOT NULL,
    "doctorName" TEXT NOT NULL,
    "symptoms" TEXT,
    "consultationNotes" TEXT,
    "diagnosis" TEXT,
    "bloodPressure" TEXT,
    "temperatureC" DECIMAL(5,2),
    "weightKg" DECIMAL(6,2),
    "pulseBpm" INTEGER,
    "prescriptions" TEXT,
    "tests" TEXT,
    "followUpDate" DATE,
    "followUpInstructions" TEXT,
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "ward" TEXT,
    "bed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientEncounter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientEncounter_vitals_check" CHECK (
      ("temperatureC" IS NULL OR "temperatureC" BETWEEN 0 AND 300) AND
      ("weightKg" IS NULL OR "weightKg" BETWEEN 0 AND 1000) AND
      ("pulseBpm" IS NULL OR "pulseBpm" BETWEEN 0 AND 300)
    ),
    CONSTRAINT "PatientEncounter_admission_dates_check" CHECK (
      "dischargedAt" IS NULL OR "admittedAt" IS NULL OR "dischargedAt" >= "admittedAt"
    )
);

ALTER TABLE "PatientEncounter"
  ADD CONSTRAINT "PatientEncounter_clinicId_id_key" UNIQUE ("clinicId", "id");

CREATE INDEX "PatientEncounter_clinicId_patientId_visitDate_idx"
  ON "PatientEncounter"("clinicId", "patientId", "visitDate");
CREATE INDEX "PatientEncounter_clinicId_encounterType_status_idx"
  ON "PatientEncounter"("clinicId", "encounterType", "status");

ALTER TABLE "PatientEncounter"
  ADD CONSTRAINT "PatientEncounter_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientEncounter"
  ADD CONSTRAINT "PatientEncounter_patientId_fkey"
  FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientEncounter"
  ADD CONSTRAINT "PatientEncounter_createdById_fkey"
  FOREIGN KEY ("clinicId", "createdById") REFERENCES "User"("clinicId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
