import type { Certificate } from "../../types/certificate";
import { toAbsolutePublicUrl } from "../../utils/qrCode";
import PublicQr from "../ui/PublicQr";

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

export default function CertificateQr({
  certificate,
  showDownload = true,
}: CertificateQrProps) {
  return (
    <PublicQr
      value={getQrValue(certificate)}
      storedDataUrl={certificate.qrCodeDataUrl}
      fileName={`vermeat-qr-${certificate.id}.png`}
      alt={`QR-код для ${certificate.id}`}
      showDownload={showDownload}
    />
  );
}
