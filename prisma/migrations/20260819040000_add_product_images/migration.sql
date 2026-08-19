CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "ProductImageStatus" AS ENUM ('READY', 'DELETED');

CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "byteSize" INTEGER,
    "mimeType" TEXT,
    "checksum" TEXT,
    "status" "ProductImageStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProductImage" ("id", "productId", "storageKey", "altText", "sortOrder", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "imageUrl", "name", 0, 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product";

CREATE UNIQUE INDEX "ProductImage_productId_sortOrder_key" ON "ProductImage"("productId", "sortOrder");
CREATE INDEX "ProductImage_productId_status_sortOrder_idx" ON "ProductImage"("productId", "status", "sortOrder");
CREATE INDEX "ProductImage_checksum_idx" ON "ProductImage"("checksum");

ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
