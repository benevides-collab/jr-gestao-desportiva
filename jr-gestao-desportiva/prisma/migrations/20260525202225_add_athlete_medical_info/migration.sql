-- AlterTable
ALTER TABLE "athlete_medical_infos" ADD COLUMN     "continuousMedication" TEXT,
ADD COLUMN     "emergencyMedicalContact" TEXT,
ADD COLUMN     "emergencyMedicalPhone" TEXT,
ADD COLUMN     "internalMedicalNotes" TEXT,
ADD COLUMN     "isFitForPhysicalActivity" BOOLEAN,
ADD COLUMN     "lastMedicalCertificateDate" TIMESTAMP(3),
ADD COLUMN     "medicalCertificateExpirationDate" TIMESTAMP(3),
ADD COLUMN     "physicalRestrictions" TEXT,
ADD COLUMN     "trainingNotes" TEXT;

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "addressId" UUID,
ADD COLUMN     "clinicName" TEXT;

-- CreateIndex
CREATE INDEX "doctors_addressId_idx" ON "doctors"("addressId");

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
