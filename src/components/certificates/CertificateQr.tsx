import { useEffect, useMemo, useState } from "react";
import type { Certificate } from "../../types/certificate";
import { createQrCodeDataUrl, toAbsolutePublicUrl } from "../../utils/qrCode";

interface CertificateQrProps {
  certificate: Certificate;
  showDownload?: boolean;
}

function getQrValue(certificate: Certificate) {
  if (certificate.qrPayload) {
    return certificate.qrPayload;
  }

  if (!certificate.publicUrl) {
    return "";
  }

  try {
    return toAbsolutePublicUrl(certificate.publicUrl);
  } catch {
    return certificate.publicUrl;
  }
}

function createQrFileName(certificateId: string) {
  const safeId = certificateId.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();

  return `vermeat-qr-${safeId}.png`;
}

export default function CertificateQr({
  certificate,
  showDownload = true,
}: CertificateQrProps) {
  const [generatedQrCode, setGeneratedQrCode] = useState<{
    value: string;
    dataUrl: string;
  } | null>(null);

  const qrValue = useMemo(() => getQrValue(certificate), [certificate]);
  const storedQrCodeDataUrl = certificate.qrCodeDataUrl ?? "";
  const generatedQrCodeDataUrl =
    generatedQrCode?.value === qrValue ? generatedQrCode.dataUrl : "";
  const qrCodeDataUrl = storedQrCodeDataUrl || generatedQrCodeDataUrl;

  useEffect(() => {
    let isActive = true;

    if (storedQrCodeDataUrl || !qrValue) {
      return () => {
        isActive = false;
      };
    }

    createQrCodeDataUrl(qrValue)
      .then((dataUrl) => {
        if (isActive) {
          setGeneratedQrCode({ value: qrValue, dataUrl });
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [qrValue, storedQrCodeDataUrl]);

  const handleDownload = () => {
    if (!qrCodeDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = createQrFileName(certificate.id);
    link.click();
  };

  if (!qrValue && !qrCodeDataUrl) {
    return null;
  }

  return (
    <div className="certificate-qr">
      {qrCodeDataUrl ? (
        <img
          className="certificate-qr__image"
          src={qrCodeDataUrl}
          alt={`QR-код для ${certificate.id}`}
        />
      ) : (
        <div className="certificate-qr__placeholder">QR</div>
      )}

      {showDownload && qrCodeDataUrl && (
        <button
          className="button button--secondary certificate-qr__download"
          type="button"
          onClick={handleDownload}
        >
          Скачать QR
        </button>
      )}
    </div>
  );
}
