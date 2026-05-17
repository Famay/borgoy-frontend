export type CertificateStatus =
  | "Подтвержден"
  | "На проверке"
  | "Есть расхождения"
  | "Ошибка blockchain";

export type PageName =
  | "Главная"
  | "Кабинет поставщика"
  | "Мои сертификаты"
  | "Реестр сертификатов"
  | "Проверка подлинности"
  | "Профиль";

export interface Certificate {
  id: string;
  supplier: string;
  product: string;
  batchNumber: string;
  originRegion: string;
  productionDate: string;
  weightKg: number;
  issueDate: string;
  status: CertificateStatus;
  blockchain: string;
  hash: string;
  authority: string;
  documentNumber: string;
  description?: string;
  fileName?: string;
  fileSize?: number;
  ipfsCid?: string;
  qrToken?: string;
  qrPayload?: string;
  qrCodeDataUrl?: string;
  publicUrl?: string;
}

export interface SupplierForm {
  supplier: string;
  productName: string;
  batchNumber: string;
  originRegion: string;
  productionDate: string;
  weightKg: string;
  authority: string;
  documentNumber: string;
  description: string;
}
