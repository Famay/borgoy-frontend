import type { AuthUser, UserRole } from "../types/auth";
import type { Certificate, CertificateStatus } from "../types/certificate";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000/api";

type ApiRole = "SUPPLIER" | "ADMIN";
type ApiCertificateStatus =
  | "PENDING"
  | "CONFIRMED"
  | "MISMATCH"
  | "BLOCKCHAIN_FAILED";

interface ApiUser {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  role: ApiRole;
  status: string;
}

interface ApiBatch {
  id: string;
  batchNumber: string;
  productName: string;
  originRegion: string;
  productionDate: string;
  weightKg: string | number;
  publicToken: string;
  supplier?: {
    id?: string;
    name: string;
    companyName?: string | null;
  };
}

interface ApiBlockchainTransaction {
  txHash: string;
}

interface ApiCertificate {
  id: string;
  certificateNo: string;
  documentNumber: string;
  authority: string;
  description?: string | null;
  issueDate: string;
  status: ApiCertificateStatus;
  fileName: string;
  fileSize: number;
  fileHash: string;
  ipfsCid?: string | null;
  qrPayload?: string | null;
  qrCodeDataUrl?: string | null;
  batch: ApiBatch;
  blockchainTransaction?: ApiBlockchainTransaction | null;
}

interface AuthResponse {
  user: ApiUser;
  token: string;
}

interface ApiAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  message: string;
  metadata?: unknown;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: ApiRole;
  } | null;
}

interface AdminOverviewResponse {
  overview: AdminOverview;
  recentLogs: ApiAuditLog[];
}

interface PublicVerifyResponse {
  isValid: boolean;
  message: string;
  certificate?: ApiCertificate;
}

interface CreateBatchPayload {
  batchNumber: string;
  productName: string;
  originRegion: string;
  productionDate: string;
  weightKg: number;
  description?: string;
}

interface UploadCertificatePayload {
  batchId: string;
  file: File;
  certificateNo?: string;
  documentNumber: string;
  authority: string;
  description?: string;
}

interface CheckCertificateFileResponse {
  exists: boolean;
  certificate: {
    certificateNo: string;
    batchNumber: string;
    productName: string;
  } | null;
}

export interface RegisterPayload {
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  inn?: string;
  password: string;
}

export interface AdminOverview {
  usersTotal: number;
  suppliersTotal: number;
  activeUsers: number;
  batchesTotal: number;
  certificatesTotal: number;
  certificatesConfirmed: number;
  certificatesPending: number;
  certificatesWithProblems: number;
  verificationChecks: number;
  failedVerificationChecks: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actionLabel: string;
  entity: string;
  entityId?: string | null;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

function mapRole(role: ApiRole): UserRole {
  return role === "ADMIN" ? "admin" : "supplier";
}

function mapAuditAction(action: string) {
  const labels: Record<string, string> = {
    USER_REGISTERED: "Регистрация пользователя",
    USER_LOGIN: "Вход в систему",
    BATCH_CREATED: "Создание партии",
    CERTIFICATE_UPLOADED: "Загрузка сертификата",
    CERTIFICATE_STATUS_UPDATED: "Изменение статуса сертификата",
    CERTIFICATE_DELETED: "Удаление сертификата",
    CERTIFICATE_VERIFIED: "Публичная проверка",
    VERIFICATION_FAILED: "Ошибка проверки",
  };

  return labels[action] ?? action;
}

function mapAuditLog(log: ApiAuditLog): AuditLogEntry {
  return {
    id: log.id,
    action: log.action,
    actionLabel: mapAuditAction(log.action),
    entity: log.entity,
    entityId: log.entityId,
    message: log.message,
    createdAt: log.createdAt,
    user: log.user
      ? {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          role: mapRole(log.user.role),
        }
      : null,
  };
}

function mapStatus(status: ApiCertificateStatus): CertificateStatus {
  if (status === "CONFIRMED") {
    return "Подтвержден";
  }

  if (status === "BLOCKCHAIN_FAILED") {
    return "Ошибка blockchain";
  }

  if (status === "MISMATCH") {
    return "Есть расхождения";
  }

  return "На проверке";
}

function mapStatusToApi(status: CertificateStatus): ApiCertificateStatus {
  if (status === "Подтвержден") {
    return "CONFIRMED";
  }

  if (status === "Есть расхождения") {
    return "MISMATCH";
  }

  if (status === "Ошибка blockchain") {
    return "BLOCKCHAIN_FAILED";
  }

  return "PENDING";
}

function mapUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapRole(user.role),
    companyName: user.companyName,
    status: user.status,
  };
}

export function mapCertificate(certificate: ApiCertificate): Certificate {
  const publicUrl = `/verify?token=${certificate.batch.publicToken}`;

  return {
    id: certificate.certificateNo,
    supplier:
      certificate.batch.supplier?.companyName ??
      certificate.batch.supplier?.name ??
      "Поставщик",
    product: certificate.batch.productName,
    batchNumber: certificate.batch.batchNumber,
    originRegion: certificate.batch.originRegion,
    productionDate: certificate.batch.productionDate.slice(0, 10),
    weightKg: Number(certificate.batch.weightKg),
    issueDate: certificate.issueDate.slice(0, 10),
    status: mapStatus(certificate.status),
    blockchain: certificate.blockchainTransaction?.txHash ?? "не записано",
    hash: certificate.fileHash,
    authority: certificate.authority,
    documentNumber: certificate.documentNumber,
    description: certificate.description ?? undefined,
    fileName: certificate.fileName,
    fileSize: certificate.fileSize,
    ipfsCid: certificate.ipfsCid ?? undefined,
    qrToken: certificate.batch.publicToken,
    qrPayload: certificate.qrPayload ?? undefined,
    qrCodeDataUrl: certificate.qrCodeDataUrl ?? undefined,
    publicUrl,
  };
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `API недоступен: ${API_URL}. Проверьте, что запущен npm run dev:api и CORS разрешает адрес frontend.`
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | T
    | null;

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      payload.message
        ? payload.message
        : "Ошибка запроса к API";

    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function loginRequest(email: string, password: string) {
  const response = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return {
    user: mapUser(response.user),
    token: response.token,
  };
}

export async function registerRequest(payload: RegisterPayload) {
  const response = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    user: mapUser(response.user),
    token: response.token,
  };
}

export async function createBatchRequest(
  payload: CreateBatchPayload,
  token: string
) {
  return request<{ batch: ApiBatch }>("/batches", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function getCertificatesRequest(token: string) {
  const response = await request<{ certificates: ApiCertificate[] }>(
    "/certificates",
    { token }
  );

  return response.certificates.map(mapCertificate);
}

export async function getAdminOverviewRequest(token: string) {
  const response = await request<AdminOverviewResponse>("/admin/overview", {
    token,
  });

  return {
    overview: response.overview,
    recentLogs: response.recentLogs.map(mapAuditLog),
  };
}

export async function getAuditLogsRequest(token: string, limit = 80) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await request<{ logs: ApiAuditLog[] }>(
    `/admin/audit-logs?${params.toString()}`,
    { token }
  );

  return response.logs.map(mapAuditLog);
}

export async function updateCertificateStatusRequest(
  certificateNo: string,
  status: CertificateStatus,
  token: string
) {
  const response = await request<{ certificate: ApiCertificate }>(
    `/admin/certificates/${encodeURIComponent(certificateNo)}/status`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: mapStatusToApi(status) }),
    }
  );

  return mapCertificate(response.certificate);
}

export async function deleteCertificateRequest(
  certificateNo: string,
  token: string
) {
  await request<void>(
    `/admin/certificates/${encodeURIComponent(certificateNo)}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function checkCertificateFileRequest(hash: string, token: string) {
  const params = new URLSearchParams({ hash });

  return request<CheckCertificateFileResponse>(
    `/certificates/check-file?${params.toString()}`,
    { token }
  );
}

export async function verifyCertificateRequest(query: string) {
  const params = new URLSearchParams({ query });
  let response: Response;

  try {
    response = await fetch(`${API_URL}/public/verify?${params.toString()}`);
  } catch {
    return {
      isValid: false,
      message: `API недоступен: ${API_URL}. Проверьте, что запущен npm run dev:api.`,
      certificate: null,
    };
  }

  const payload = (await response.json().catch(() => null)) as
    | PublicVerifyResponse
    | { message?: string }
    | null;

  if (!response.ok || !payload || !("certificate" in payload)) {
    return {
      isValid: false,
      message:
        payload && "message" in payload && payload.message
          ? payload.message
          : "Запись не найдена",
      certificate: null,
    };
  }

  return {
    isValid: payload.isValid,
    message: payload.message,
    certificate: payload.certificate
      ? mapCertificate(payload.certificate)
      : null,
  };
}

export async function uploadCertificateRequest(
  payload: UploadCertificatePayload,
  token: string
) {
  const formData = new FormData();
  formData.append("file", payload.file);

  if (payload.certificateNo) {
    formData.append("certificateNo", payload.certificateNo);
  }

  formData.append("documentNumber", payload.documentNumber);
  formData.append("authority", payload.authority);

  if (payload.description) {
    formData.append("description", payload.description);
  }

  const response = await request<{ certificate: ApiCertificate }>(
    `/batches/${payload.batchId}/certificates`,
    {
      method: "POST",
      token,
      body: formData,
    }
  );

  return mapCertificate(response.certificate);
}
