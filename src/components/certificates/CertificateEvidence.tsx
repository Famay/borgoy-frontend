import type { ReactNode } from "react";
import type { Certificate } from "../../types/certificate";
import { formatFileSize, shortenHash } from "../../utils/certificates";

interface CertificateEvidenceProps {
  certificate: Certificate;
  mode?: "compact" | "full";
  showPublicLink?: boolean;
}

function getPolygonTxUrl(txHash: string) {
  if (!/^0x[0-9a-f]{64}$/i.test(txHash)) {
    return "";
  }

  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

function ExternalLink({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <span className="evidence-link evidence-link--disabled">{children}</span>;
  }

  return (
    <a className="evidence-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function CertificateEvidence({
  certificate,
  mode = "compact",
  showPublicLink = true,
}: CertificateEvidenceProps) {
  const polygonTxUrl = getPolygonTxUrl(certificate.blockchain);
  const hasIpfs = Boolean(certificate.ipfsCid);
  const hasQr = Boolean(
    certificate.qrCodeDataUrl || certificate.qrPayload || certificate.publicUrl
  );

  return (
    <div className={`certificate-evidence certificate-evidence--${mode}`}>
      <div className="certificate-evidence__header">
        <div>
          <div className="certificate-evidence__eyebrow">Подтверждение</div>
          <div className="certificate-evidence__title">IPFS и Polygon Amoy</div>
        </div>
        <div className="certificate-evidence__chips">
          <span className={polygonTxUrl ? "evidence-chip" : "evidence-chip evidence-chip--muted"}>
            Polygon
          </span>
          <span className={hasIpfs ? "evidence-chip" : "evidence-chip evidence-chip--muted"}>
            IPFS
          </span>
          <span className={hasQr ? "evidence-chip" : "evidence-chip evidence-chip--muted"}>
            QR
          </span>
        </div>
      </div>

      <div className="certificate-evidence__rows">
        <div className="certificate-evidence__row">
          <span>SHA-256</span>
          <strong>{shortenHash(certificate.hash, 18, 12)}</strong>
        </div>
        <div className="certificate-evidence__row">
          <span>IPFS CID</span>
          <strong>{certificate.ipfsCid ?? "не загружен"}</strong>
        </div>
        <div className="certificate-evidence__row">
          <span>Polygon tx</span>
          <strong>{shortenHash(certificate.blockchain, 14, 10)}</strong>
        </div>
        {certificate.blockchainBlockNumber && (
          <div className="certificate-evidence__row">
            <span>Блок</span>
            <strong>{certificate.blockchainBlockNumber}</strong>
          </div>
        )}
        {mode === "full" && (
          <div className="certificate-evidence__row">
            <span>Файл</span>
            <strong>
              {certificate.fileName ?? "не указан"} · {formatFileSize(certificate.fileSize)}
            </strong>
          </div>
        )}
      </div>

      <div className="certificate-evidence__links">
        <ExternalLink href={polygonTxUrl}>Открыть PolygonScan</ExternalLink>
        <ExternalLink href={certificate.ipfsUrl}>Открыть IPFS</ExternalLink>
        {showPublicLink && (
          <ExternalLink href={certificate.publicUrl}>Публичная проверка</ExternalLink>
        )}
      </div>
    </div>
  );
}
