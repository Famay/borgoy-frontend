import type { Certificate } from "../types/certificate";

export function getCertificateStats(certificates: Certificate[]) {
  return certificates.reduce(
    (stats, certificate) => {
      stats.total += 1;

      if (certificate.status.startsWith("Р")) {
        if (certificate.status.includes("Сџ") || certificate.status.includes("џ")) {
          stats.confirmed += 1;
        } else if (certificate.status.includes("Сњ") || certificate.status.includes("њ")) {
          stats.checking += 1;
        } else {
          stats.issues += 1;
        }
      } else if (certificate.status === "Подтвержден") {
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
