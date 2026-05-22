import { useState, type ReactNode } from "react";
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

function getPublicUrl(publicUrl?: string) {
  if (!publicUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(publicUrl)) {
    return publicUrl;
  }

  return `${window.location.origin}${publicUrl}`;
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

function CopyButton({ value, label }: { value?: string; label: string }) {
  const [isCopied, setIsCopied] = useState(false);

  if (!value) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <button
      className="copy-button"
      type="button"
      onClick={() => void handleCopy()}
      title={`Скопировать ${label}`}
    >
      {isCopied ? "Скопировано" : "Копировать"}
    </button>
  );
}

export default function CertificateEvidence({
  certificate,
  mode = "compact",
  showPublicLink = true,
}: CertificateEvidenceProps) {
  const polygonTxUrl = getPolygonTxUrl(certificate.blockchain);
  const publicUrl = getPublicUrl(certificate.publicUrl);
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
          <span
            className={
              polygonTxUrl ? "evidence-chip" : "evidence-chip evidence-chip--muted"
            }
          >
            Polygon
          </span>
          <span
            className={hasIpfs ? "evidence-chip" : "evidence-chip evidence-chip--muted"}
          >
            IPFS
          </span>
          <span
            className={hasQr ? "evidence-chip" : "evidence-chip evidence-chip--muted"}
          >
            QR
          </span>
        </div>
      </div>

      <div className="certificate-evidence__rows">
        <div className="certificate-evidence__row">
          <span>SHA-256</span>
          <div className="copyable-value">
            <strong>{shortenHash(certificate.hash, 18, 12)}</strong>
            <CopyButton value={certificate.hash} label="SHA-256" />
          </div>
        </div>
        <div className="certificate-evidence__row">
          <span>IPFS CID</span>
          <div className="copyable-value">
            <strong>{certificate.ipfsCid ?? "не загружен"}</strong>
            <CopyButton value={certificate.ipfsCid} label="IPFS CID" />
          </div>
        </div>
        <div className="certificate-evidence__row">
          <span>Polygon tx</span>
          <div className="copyable-value">
            <strong>{shortenHash(certificate.blockchain, 14, 10)}</strong>
            <CopyButton
              value={polygonTxUrl ? certificate.blockchain : undefined}
              label="Polygon tx"
            />
          </div>
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
        {showPublicLink && (
          <CopyButton value={publicUrl} label="публичную ссылку" />
        )}
      </div>
    </div>
  );
}
