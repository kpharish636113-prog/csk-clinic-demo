CREATE TYPE "QueueTokenPriority" AS ENUM ('NORMAL', 'EMERGENCY');
CREATE TYPE "QueueTokenStatus" AS ENUM (
    'WAITING',
    'CALLED',
    'IN_CONSULTATION',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE "QueueSequence" (
    "clinicId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "queueDate" DATE NOT NULL,
    "lastTokenNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QueueSequence_pkey" PRIMARY KEY ("clinicId", "doctorId", "queueDate")
);

CREATE TABLE "QueueToken" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "appointmentId" UUID,
    "queueDate" DATE NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "priority" "QueueTokenPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "QueueTokenStatus" NOT NULL DEFAULT 'WAITING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QueueToken_appointmentId_key" ON "QueueToken"("appointmentId");
CREATE UNIQUE INDEX "QueueToken_clinicId_doctorId_queueDate_tokenNumber_key"
    ON "QueueToken"("clinicId", "doctorId", "queueDate", "tokenNumber");
CREATE INDEX "QueueToken_clinicId_queueDate_status_priority_tokenNumber_idx"
    ON "QueueToken"("clinicId", "queueDate", "status", "priority", "tokenNumber");
CREATE INDEX "QueueToken_clinicId_patientId_queueDate_idx"
    ON "QueueToken"("clinicId", "patientId", "queueDate");

ALTER TABLE "QueueSequence"
    ADD CONSTRAINT "QueueSequence_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueSequence"
    ADD CONSTRAINT "QueueSequence_clinicId_doctorId_fkey"
    FOREIGN KEY ("clinicId", "doctorId") REFERENCES "User"("clinicId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QueueToken"
    ADD CONSTRAINT "QueueToken_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueToken"
    ADD CONSTRAINT "QueueToken_clinicId_patientId_fkey"
    FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueToken"
    ADD CONSTRAINT "QueueToken_clinicId_doctorId_fkey"
    FOREIGN KEY ("clinicId", "doctorId") REFERENCES "User"("clinicId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueToken"
    ADD CONSTRAINT "QueueToken_clinicId_createdById_fkey"
    FOREIGN KEY ("clinicId", "createdById") REFERENCES "User"("clinicId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueToken"
    ADD CONSTRAINT "QueueToken_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
