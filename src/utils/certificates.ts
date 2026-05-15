import type { Certificate } from "../types/certificate";

export function getCertificateStats(certificates: Certificate[]) {
  return certificates.reduce(
    (stats, certificate) => {
      stats.total += 1;

      if (certificate.status === "Подтвержден") {
        stats.confirmed += 1;
      } else if (certificate.status === "На проверке") {
        stats.checking += 1;
      } else {
        stats.issues += 1;
      }

      return stats;
    },
    {
      total: 0,
      confirmed: 0,
      checking: 0,
      issues: 0,
    }
  );
}

export function formatFileSize(bytes?: number) {
  if (!bytes) {
    return "Файл не выбран";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function shortenHash(value?: string, left = 12, right = 8) {
  if (!value) {
    return "не сформирован";
  }

  if (value.length <= left + right + 3) {
    return value;
  }

  return `${value.slice(0, left)}...${value.slice(-right)}`;
}
