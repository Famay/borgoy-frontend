import { useEffect, useMemo, useState } from "react";
import { createQrCodeDataUrl } from "../../utils/qrCode";

interface PublicQrProps {
  value: string;
  fileName: string;
  alt: string;
  storedDataUrl?: string;
  showDownload?: boolean;
}

function createSafeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
}

export default function PublicQr({
  value,
  fileName,
  alt,
  storedDataUrl = "",
  showDownload = true,
}: PublicQrProps) {
  const [generatedQrCode, setGeneratedQrCode] = useState<{
    value: string;
    dataUrl: string;
  } | null>(null);
  const generatedQrCodeDataUrl =
    generatedQrCode?.value === value ? generatedQrCode.dataUrl : "";
  const qrCodeDataUrl = storedDataUrl || generatedQrCodeDataUrl;
  const downloadFileName = useMemo(() => createSafeFileName(fileName), [fileName]);

  useEffect(() => {
    let isActive = true;

    if (storedDataUrl || !value) {
      return () => {
        isActive = false;
      };
    }

    createQrCodeDataUrl(value)
      .then((dataUrl) => {
        if (isActive) {
          setGeneratedQrCode({ value, dataUrl });
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [storedDataUrl, value]);

  const handleDownload = () => {
    if (!qrCodeDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = downloadFileName;
    link.click();
  };

  if (!value && !qrCodeDataUrl) {
    return null;
  }

  return (
    <div className="certificate-qr">
      {qrCodeDataUrl ? (
        <img className="certificate-qr__image" src={qrCodeDataUrl} alt={alt} />
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
