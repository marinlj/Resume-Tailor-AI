-- DropIndex
DROP INDEX "Achievement_userId_idx";

-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "company",
DROP COLUMN "endDate",
DROP COLUMN "location",
DROP COLUMN "startDate",
DROP COLUMN "title",
DROP COLUMN "userId",
ALTER COLUMN "roleId" SET NOT NULL;
