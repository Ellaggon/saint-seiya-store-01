-- CreateStoreSettings
CREATE TABLE IF NOT EXISTS "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
