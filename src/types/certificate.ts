export type CertificateStatus =
  | "Подтвержден"
  | "На проверке"
  | "Есть расхождения";

export type PageName =
  | "Главная"
  | "Кабинет поставщика"
  | "Реестр сертификатов"
  | "Проверка подлинности"
  | "Профиль";

export interface Certificate {
  id: string;
  supplier: string;
  product: string;
  issueDate: string;
  status: CertificateStatus;
  blockchain: string;
  hash: string;
  authority: string;
  description?: string;
}

export interface SupplierForm {
  supplier: string;
  product: string;
  authority: string;
  description: string;
}