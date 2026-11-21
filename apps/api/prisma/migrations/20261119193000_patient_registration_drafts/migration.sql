CREATE TABLE "PatientDraft" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientDraft_clinicId_updatedAt_idx"
    ON "PatientDraft"("clinicId", "updatedAt");
CREATE INDEX "PatientDraft_clinicId_createdById_updatedAt_idx"
    ON "PatientDraft"("clinicId", "createdById", "updatedAt");

ALTER TABLE "PatientDraft"
    ADD CONSTRAINT "PatientDraft_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDraft"
    ADD CONSTRAINT "PatientDraft_clinicId_createdById_fkey"
    FOREIGN KEY ("clinicId", "createdById") REFERENCES "User"("clinicId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
