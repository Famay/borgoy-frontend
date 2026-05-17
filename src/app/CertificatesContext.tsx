/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { certificatesSeed } from "../data/certificates";
import type { Certificate } from "../types/certificate";

interface CertificatesContextValue {
  certificates: Certificate[];
  addCertificate: (entry: Certificate) => void;
}

const CertificatesContext = createContext<CertificatesContextValue | undefined>(
  undefined
);

const CERTIFICATES_STORAGE_KEY = "vermeat.certificates";
const SEED_CERTIFICATE_IDS = new Set(certificatesSeed.map((item) => item.id));

function isSeedCertificate(entry: Partial<Certificate>) {
  return Boolean(
    entry.id &&
      SEED_CERTIFICATE_IDS.has(entry.id) &&
      entry.ipfsCid?.includes("demo")
  );
}

function normalizeCertificate(entry: Partial<Certificate>, index: number) {
  const defaults = certificatesSeed[index] ?? certificatesSeed[0];

  return {
    ...defaults,
    ...entry,
    batchNumber: entry.batchNumber ?? defaults.batchNumber,
    originRegion: entry.originRegion ?? defaults.originRegion,
    productionDate: entry.productionDate ?? defaults.productionDate,
    weightKg: entry.weightKg ?? defaults.weightKg,
    documentNumber: entry.documentNumber ?? defaults.documentNumber,
    qrToken: entry.qrToken ?? defaults.qrToken,
    qrPayload: entry.qrPayload ?? defaults.qrPayload,
    qrCodeDataUrl: entry.qrCodeDataUrl ?? defaults.qrCodeDataUrl,
    publicUrl: entry.publicUrl ?? defaults.publicUrl,
  };
}

function readStoredCertificates() {
  const stored = localStorage.getItem(CERTIFICATES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const productionEntries = parsed.filter(
      (entry) => !isSeedCertificate(entry as Partial<Certificate>)
    );

    if (productionEntries.length !== parsed.length) {
      localStorage.setItem(
        CERTIFICATES_STORAGE_KEY,
        JSON.stringify(productionEntries)
      );
    }

    return productionEntries.map((entry, index) =>
      normalizeCertificate(entry as Partial<Certificate>, index)
    );
  } catch {
    localStorage.removeItem(CERTIFICATES_STORAGE_KEY);
    return [];
  }
}

export function CertificatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [certificates, setCertificates] =
    useState<Certificate[]>(() => readStoredCertificates());

  const addCertificate = (entry: Certificate) => {
    setCertificates((prev) => [entry, ...prev]);
  };

  useEffect(() => {
    localStorage.setItem(CERTIFICATES_STORAGE_KEY, JSON.stringify(certificates));
  }, [certificates]);

  const value = useMemo(
    () => ({
      certificates,
      addCertificate,
    }),
    [certificates]
  );

  return (
    <CertificatesContext.Provider value={value}>
      {children}
    </CertificatesContext.Provider>
  );
}

export function useCertificates() {
  const context = useContext(CertificatesContext);

  if (!context) {
    throw new Error("useCertificates must be used within CertificatesProvider");
  }

  return context;
}
