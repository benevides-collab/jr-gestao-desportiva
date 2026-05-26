-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL;

-- AlterTable
ALTER TABLE "athletes" ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "photoUrl" TEXT;
