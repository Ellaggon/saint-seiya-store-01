-- CreateTable
CREATE TABLE IF NOT EXISTS "HomeContent" (
    "id" TEXT NOT NULL DEFAULT 'home',
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("id")
);
