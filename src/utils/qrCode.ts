import { toDataURL } from "qrcode";

export function toAbsolutePublicUrl(publicUrl: string) {
  return new URL(publicUrl, window.location.origin).toString();
}

export function createQrCodeDataUrl(value: string) {
  return toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: {
      dark: "#111827ff",
      light: "#ffffffff",
    },
  });
}
