-- AlterEnum
ALTER TYPE "SchoolType" ADD VALUE 'not_informed';

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "notes" TEXT;
