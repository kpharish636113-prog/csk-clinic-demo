CREATE TYPE "NurseIntakeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED');
CREATE TYPE "NurseAllergyStatus" AS ENUM ('CONFIRMED_NONE', 'HAS_ALLERGIES', 'NOT_CONFIRMED');

CREATE TABLE "NurseIntake" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "queueTokenId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "enteredById" UUID NOT NULL,
    "reviewedById" UUID,
    "status" "NurseIntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "chiefComplaint" TEXT NOT NULL,
    "onset" TEXT,
    "symptoms" TEXT,
    "allergyStatus" "NurseAllergyStatus" NOT NULL DEFAULT 'NOT_CONFIRMED',
    "allergyDetails" TEXT,
    "medicationsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "medicationNotes" TEXT,
    "painScore" INTEGER,
    "bloodPressure" TEXT,
    "temperatureC" DECIMAL(5,2),
    "pulseBpm" INTEGER,
    "spo2Percent" DECIMAL(5,2),
    "cbgMgDl" DECIMAL(7,2),
    "weightKg" DECIMAL(6,2),
    "heightCm" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "nurseNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurseIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NurseIntake_queueTokenId_key" ON "NurseIntake"("queueTokenId");
CREATE UNIQUE INDEX "NurseIntake_clinicId_id_key" ON "NurseIntake"("clinicId", "id");
CREATE UNIQUE INDEX "NurseIntake_clinicId_queueTokenId_key" ON "NurseIntake"("clinicId", "queueTokenId");
CREATE UNIQUE INDEX "QueueToken_clinicId_id_key" ON "QueueToken"("clinicId", "id");
CREATE INDEX "NurseIntake_clinicId_status_submittedAt_idx" ON "NurseIntake"("clinicId", "status", "submittedAt");
CREATE INDEX "NurseIntake_clinicId_patientId_createdAt_idx" ON "NurseIntake"("clinicId", "patientId", "createdAt");

ALTER TABLE "NurseIntake"
ADD CONSTRAINT "NurseIntake_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NurseIntake"
ADD CONSTRAINT "NurseIntake_clinicId_queueTokenId_fkey"
FOREIGN KEY ("clinicId", "queueTokenId") REFERENCES "QueueToken"("clinicId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NurseIntake"
ADD CONSTRAINT "NurseIntake_clinicId_patientId_fkey"
FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NurseIntake"
ADD CONSTRAINT "NurseIntake_clinicId_enteredById_fkey"
FOREIGN KEY ("clinicId", "enteredById") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NurseIntake"
ADD CONSTRAINT "NurseIntake_clinicId_reviewedById_fkey"
FOREIGN KEY ("clinicId", "reviewedById") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
