-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "date" TEXT,
    "location" TEXT,
    "bullets" TEXT[],
    "tags" TEXT[],
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryItem_userId_type_idx" ON "LibraryItem"("userId", "type");

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
