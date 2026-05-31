-- Preserve certificate evidence and blockchain links when an administrator
-- invalidates a certificate.
ALTER TYPE "CertificateStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CERTIFICATE_CANCELLED';

ALTER TABLE "Certificate"
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" TEXT;

CREATE INDEX "Certificate_cancelledById_idx" ON "Certificate"("cancelledById");

ALTER TABLE "Certificate"
ADD CONSTRAINT "Certificate_cancelledById_fkey"
FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
