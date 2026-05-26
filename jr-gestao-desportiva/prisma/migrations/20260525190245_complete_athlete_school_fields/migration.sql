-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('public', 'private', 'special', 'other');

-- AlterTable
ALTER TABLE "athlete_schools" ADD COLUMN     "schoolNotes" TEXT,
ADD COLUMN     "therapeuticCompanionEmail" TEXT,
ADD COLUMN     "therapeuticCompanionName" TEXT,
ADD COLUMN     "therapeuticCompanionNotes" TEXT,
ADD COLUMN     "therapeuticCompanionPhone" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "coordinatorEmail" TEXT,
ADD COLUMN     "coordinatorName" TEXT,
ADD COLUMN     "coordinatorPhone" TEXT,
ADD COLUMN     "pedagogicalContactEmail" TEXT,
ADD COLUMN     "pedagogicalContactName" TEXT,
ADD COLUMN     "pedagogicalContactPhone" TEXT,
ADD COLUMN     "pedagogicalContactRole" TEXT,
ADD COLUMN     "schoolType" "SchoolType" NOT NULL DEFAULT 'other';
