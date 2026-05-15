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

function normalizeCertificate(entry: Partial<Certificate>, index: number) {
  const fallback = certificatesSeed[index] ?? certificatesSeed[0];

  return {
    ...fallback,
    ...entry,
    batchNumber: entry.batchNumber ?? fallback.batchNumber,
    originRegion: entry.originRegion ?? fallback.originRegion,
    productionDate: entry.productionDate ?? fallback.productionDate,
    weightKg: entry.weightKg ?? fallback.weightKg,
    documentNumber: entry.documentNumber ?? fallback.documentNumber,
    qrToken: entry.qrToken ?? fallback.qrToken,
    qrPayload: entry.qrPayload ?? fallback.qrPayload,
    qrCodeDataUrl: entry.qrCodeDataUrl ?? fallback.qrCodeDataUrl,
    publicUrl: entry.publicUrl ?? fallback.publicUrl,
  };
}

function readStoredCertificates() {
  const stored = localStorage.getItem(CERTIFICATES_STORAGE_KEY);

  if (!stored) {
    return certificatesSeed;
  }

  try {
    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed.map((entry, index) =>
          normalizeCertificate(entry as Partial<Certificate>, index)
        )
      : certificatesSeed;
  } catch {
    localStorage.removeItem(CERTIFICATES_STORAGE_KEY);
    return certificatesSeed;
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
