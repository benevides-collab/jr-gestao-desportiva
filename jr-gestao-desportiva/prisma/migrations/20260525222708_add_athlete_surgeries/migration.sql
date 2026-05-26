-- CreateTable
CREATE TABLE "athlete_surgeries" (
    "id" UUID NOT NULL,
    "medicalInfoId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "athlete_surgeries_medicalInfoId_idx" ON "athlete_surgeries"("medicalInfoId");

-- AddForeignKey
ALTER TABLE "athlete_surgeries" ADD CONSTRAINT "athlete_surgeries_medicalInfoId_fkey" FOREIGN KEY ("medicalInfoId") REFERENCES "athlete_medical_infos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
