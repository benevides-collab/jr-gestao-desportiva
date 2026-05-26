-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'card';
ALTER TYPE "PaymentMethod" ADD VALUE 'not_informed';

-- AlterTable
ALTER TABLE "monthly_fees" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "financialGuardianId" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "recordedByUserId" UUID;

-- CreateIndex
CREATE INDEX "monthly_fees_financialGuardianId_idx" ON "monthly_fees"("financialGuardianId");

-- CreateIndex
CREATE INDEX "payments_recordedByUserId_idx" ON "payments"("recordedByUserId");

-- AddForeignKey
ALTER TABLE "monthly_fees" ADD CONSTRAINT "monthly_fees_financialGuardianId_fkey" FOREIGN KEY ("financialGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
