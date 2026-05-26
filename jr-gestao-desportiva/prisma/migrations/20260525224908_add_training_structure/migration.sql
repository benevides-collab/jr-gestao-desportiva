-- AlterEnum
ALTER TYPE "StaffMemberType" ADD VALUE 'other';

-- AlterTable
ALTER TABLE "athlete_classes" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ALTER COLUMN "joinedAt" DROP NOT NULL,
ALTER COLUMN "joinedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "class_schedules" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "modalities" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "staff_members" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "training_classes" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "training_locations" ADD COLUMN     "accessibility" TEXT,
ADD COLUMN     "mapUrl" TEXT;

-- CreateTable
CREATE TABLE "staff_modalities" (
    "id" UUID NOT NULL,
    "staffMemberId" UUID NOT NULL,
    "modalityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_modalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_class_assistants" (
    "id" UUID NOT NULL,
    "trainingClassId" UUID NOT NULL,
    "staffMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_class_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_modalities_modalityId_idx" ON "staff_modalities"("modalityId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_modalities_staffMemberId_modalityId_key" ON "staff_modalities"("staffMemberId", "modalityId");

-- CreateIndex
CREATE INDEX "training_class_assistants_staffMemberId_idx" ON "training_class_assistants"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "training_class_assistants_trainingClassId_staffMemberId_key" ON "training_class_assistants"("trainingClassId", "staffMemberId");

-- AddForeignKey
ALTER TABLE "staff_modalities" ADD CONSTRAINT "staff_modalities_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_modalities" ADD CONSTRAINT "staff_modalities_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_class_assistants" ADD CONSTRAINT "training_class_assistants_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_class_assistants" ADD CONSTRAINT "training_class_assistants_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
