-- CreateTable
CREATE TABLE "ResumeStructure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactFields" TEXT[],
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeStructure_userId_key" ON "ResumeStructure"("userId");

-- AddForeignKey
ALTER TABLE "ResumeStructure" ADD CONSTRAINT "ResumeStructure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
