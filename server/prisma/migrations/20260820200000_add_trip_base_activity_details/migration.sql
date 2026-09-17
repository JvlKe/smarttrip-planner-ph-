ALTER TABLE "Trip"
ADD COLUMN "baseName" TEXT,
ADD COLUMN "baseAddress" TEXT,
ADD COLUMN "baseCheckIn" TEXT,
ADD COLUMN "baseCheckOut" TEXT;

ALTER TABLE "Activity"
ADD COLUMN "referenceNumber" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "phone" TEXT;
