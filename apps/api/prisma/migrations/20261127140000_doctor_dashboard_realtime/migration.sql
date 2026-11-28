ALTER TYPE "QueueTokenStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TABLE "QueueToken"
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "noShowAt" TIMESTAMP(3);

CREATE INDEX "QueueToken_clinicId_doctorId_queueDate_status_idx"
  ON "QueueToken"("clinicId", "doctorId", "queueDate", "status");

DO $$
BEGIN
  IF to_regrole('authenticated') IS NOT NULL
     AND to_regprocedure('auth.jwt()') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."QueueToken" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'GRANT SELECT ON TABLE public."QueueToken" TO authenticated';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'QueueToken'
        AND policyname = 'doctor_realtime_queue_select'
    ) THEN
      EXECUTE 'CREATE POLICY doctor_realtime_queue_select ON public."QueueToken" FOR SELECT TO authenticated USING (
        "doctorId" = (auth.jwt() ->> ''doctor_id'')::uuid
        AND "clinicId" = (auth.jwt() ->> ''clinic_id'')::uuid
      )';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'QueueToken'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."QueueToken";
  END IF;
END
$$;
