CREATE TABLE "AtlasAnswer" (
    "id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "normalizedQuestion" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AtlasAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AtlasAnswer_fingerprint_key" ON "AtlasAnswer"("fingerprint");
CREATE INDEX "AtlasAnswer_updatedAt_idx" ON "AtlasAnswer"("updatedAt");
