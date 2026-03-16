-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT;
