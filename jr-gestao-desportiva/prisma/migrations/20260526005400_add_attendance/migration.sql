ALTER TABLE "attendances" RENAME COLUMN "date" TO "attendanceDate";

ALTER TABLE "attendances"
ADD COLUMN "recordedByUserId" UUID,
ADD COLUMN "updatedByUserId" UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'attendances_athleteId_trainingClassId_date_key'
  ) THEN
    ALTER INDEX "attendances_athleteId_trainingClassId_date_key"
    RENAME TO "attendances_athleteId_trainingClassId_attendanceDate_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'attendances_trainingClassId_date_idx'
  ) THEN
    ALTER INDEX "attendances_trainingClassId_date_idx"
    RENAME TO "attendances_trainingClassId_attendanceDate_idx";
  END IF;
END $$;

CREATE INDEX "attendances_recordedByUserId_idx" ON "attendances"("recordedByUserId");
CREATE INDEX "attendances_updatedByUserId_idx" ON "attendances"("updatedByUserId");

ALTER TABLE "attendances"
ADD CONSTRAINT "attendances_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attendances"
ADD CONSTRAINT "attendances_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
