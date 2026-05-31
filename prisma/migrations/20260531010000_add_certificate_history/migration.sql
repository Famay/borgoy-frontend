CREATE TYPE "CertificateHistoryAction" AS ENUM ('CREATED', 'STATUS_UPDATED', 'CANCELLED');

CREATE TABLE "CertificateHistory" (
    "id" TEXT NOT NULL,
    "action" "CertificateHistoryAction" NOT NULL,
    "previousStatus" "CertificateStatus",
    "nextStatus" "CertificateStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "reason" TEXT,
    "certificateId" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CertificateHistory_certificateId_idx" ON "CertificateHistory"("certificateId");
CREATE INDEX "CertificateHistory_changedById_idx" ON "CertificateHistory"("changedById");
CREATE INDEX "CertificateHistory_createdAt_idx" ON "CertificateHistory"("createdAt");

ALTER TABLE "CertificateHistory"
ADD CONSTRAINT "CertificateHistory_certificateId_fkey"
FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CertificateHistory"
ADD CONSTRAINT "CertificateHistory_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "CertificateHistory" (
    "id",
    "action",
    "nextStatus",
    "message",
    "certificateId",
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    'CREATED'::"CertificateHistoryAction",
    "status",
    'Начальное состояние сертификата',
    "id",
    "createdAt"
FROM "Certificate";
