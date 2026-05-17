ALTER TABLE "User"
DROP COLUMN IF EXISTS "twoFactorSecret",
DROP COLUMN IF EXISTS "twoFactorEnabledAt";

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "twoFactorCodeHash" TEXT,
ADD COLUMN IF NOT EXISTS "twoFactorCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "twoFactorCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "twoFactorCodeSentAt" TIMESTAMP(3);

ALTER TABLE "User" ALTER COLUMN "twoFactorEnabled" SET DEFAULT true;

UPDATE "User"
SET "twoFactorEnabled" = true
WHERE "role" IN ('SUPPLIER', 'ADMIN');

UPDATE "User"
SET "phone" = '+7 (999) 765-43-21'
WHERE "email" = 'admin@vermeat.ru' AND "phone" IS NULL;
