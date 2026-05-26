-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "staffMemberId" UUID;

-- CreateIndex
CREATE INDEX "users_staffMemberId_idx" ON "users"("staffMemberId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
