-- CreateTable
CREATE TABLE "training_class_teachers" (
    "id" UUID NOT NULL,
    "trainingClassId" UUID NOT NULL,
    "staffMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_class_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_class_teachers_staffMemberId_idx" ON "training_class_teachers"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "training_class_teachers_trainingClassId_staffMemberId_key" ON "training_class_teachers"("trainingClassId", "staffMemberId");

-- AddForeignKey
ALTER TABLE "training_class_teachers" ADD CONSTRAINT "training_class_teachers_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_class_teachers" ADD CONSTRAINT "training_class_teachers_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
