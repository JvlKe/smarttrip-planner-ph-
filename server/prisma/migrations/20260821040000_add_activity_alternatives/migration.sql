CREATE TABLE "SuggestedActivity" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "startTime" TEXT,
    "durationMin" INTEGER,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "position" INTEGER NOT NULL,
    CONSTRAINT "SuggestedActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuggestedActivity_tripId_position_idx" ON "SuggestedActivity"("tripId", "position");

ALTER TABLE "SuggestedActivity"
ADD CONSTRAINT "SuggestedActivity_tripId_fkey"
FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
