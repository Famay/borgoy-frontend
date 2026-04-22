/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import { certificatesSeed } from "../data/certificates";
import type { Certificate } from "../types/certificate";

interface CertificatesContextValue {
  certificates: Certificate[];
  addCertificate: (entry: Certificate) => void;
}

const CertificatesContext = createContext<CertificatesContextValue | undefined>(
  undefined
);

export function CertificatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [certificates, setCertificates] =
    useState<Certificate[]>(certificatesSeed);

  const addCertificate = (entry: Certificate) => {
    setCertificates((prev) => [entry, ...prev]);
  };

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