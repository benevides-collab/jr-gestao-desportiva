-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('planned', 'confirmed', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "CompetitionMedal" AS ENUM ('gold', 'silver', 'bronze', 'participation', 'none');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CompetitionAthleteStatus" ADD VALUE 'pending';
ALTER TYPE "CompetitionAthleteStatus" ADD VALUE 'canceled';
ALTER TYPE "CompetitionAthleteStatus" ADD VALUE 'participated';

-- AlterTable
ALTER TABLE "competition_athletes" ADD COLUMN     "documentsOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guardianOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medal" "CompetitionMedal" NOT NULL DEFAULT 'none',
ADD COLUMN     "medicalClearanceOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "participated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placement" TEXT,
ADD COLUMN     "presenceConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "result" TEXT;

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "meetingTime" TEXT,
ADD COLUMN     "modalityId" UUID,
ADD COLUMN     "organizer" TEXT,
ADD COLUMN     "responsibleTeacherId" UUID,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" "CompetitionStatus" NOT NULL DEFAULT 'planned',
ADD COLUMN     "transportation" TEXT;

-- CreateTable
CREATE TABLE "competition_assistants" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "staffMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competition_assistants_staffMemberId_idx" ON "competition_assistants"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_assistants_competitionId_staffMemberId_key" ON "competition_assistants"("competitionId", "staffMemberId");

-- CreateIndex
CREATE INDEX "competition_athletes_status_idx" ON "competition_athletes"("status");

-- CreateIndex
CREATE INDEX "competitions_modalityId_idx" ON "competitions"("modalityId");

-- CreateIndex
CREATE INDEX "competitions_responsibleTeacherId_idx" ON "competitions"("responsibleTeacherId");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "modalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_responsibleTeacherId_fkey" FOREIGN KEY ("responsibleTeacherId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_assistants" ADD CONSTRAINT "competition_assistants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_assistants" ADD CONSTRAINT "competition_assistants_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
