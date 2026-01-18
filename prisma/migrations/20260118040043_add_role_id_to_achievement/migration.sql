-- DropForeignKey
ALTER TABLE "Achievement" DROP CONSTRAINT "Achievement_userId_fkey";

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "roleId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "company" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Achievement_roleId_idx" ON "Achievement"("roleId");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
