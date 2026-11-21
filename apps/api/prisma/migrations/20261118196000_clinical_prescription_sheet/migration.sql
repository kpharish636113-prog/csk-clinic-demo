ALTER TABLE "PatientEncounter"
ADD COLUMN "spo2Percent" DECIMAL(5,2),
ADD COLUMN "cbgMgDl" DECIMAL(7,2),
ADD COLUMN "heightCm" DECIMAL(6,2),
ADD COLUMN "bmi" DECIMAL(5,2),
ADD COLUMN "knownCase" TEXT,
ADD COLUMN "investigationAdvice" TEXT,
ADD COLUMN "referralDetails" TEXT;
