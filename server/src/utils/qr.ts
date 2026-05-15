import { toDataURL } from "qrcode";
import { env } from "../config/env";

export function createPublicVerifyUrl(token: string) {
  return new URL(`/verify?token=${token}`, env.PUBLIC_APP_URL).toString();
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
