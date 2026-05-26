-- AlterTable
ALTER TABLE "athlete_guardians" ADD COLUMN     "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFinancialGuardian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLegalGuardian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "whatsapp" TEXT;
