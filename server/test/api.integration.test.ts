import assert from "node:assert/strict";
import fs from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcrypt";
import {
  AuditAction,
  CertificateHistoryAction,
  CertificateStatus,
  UserRole,
  UserStatus,
} from "../generated/prisma/enums";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";
import { signAccessToken } from "../src/middleware/auth";

const adminEmail = "admin.integration@vermeat.test";
const adminPassword = "admin-password";
const supplierEmail = "supplier.integration@vermeat.test";
const supplierPassword = "supplier-password";
const outboxFilePath = path.join(
  process.cwd(),
  "server",
  "email-outbox",
  "2fa-codes.txt"
);

interface ApiResponse<T> {
  status: number;
  body: T;
  headers: Headers;
}

interface TokenResponse {
  token: string;
}

interface LoginChallengeResponse {
  twoFactorRequired: boolean;
  challengeToken: string;
}

interface ErrorResponse {
  message: string;
}

interface BatchResponse {
  batch: {
    id: string;
    batchNumber: string;
    publicToken: string;
  };
}

interface CertificateResponse {
  certificate: {
    id: string;
    certificateNo: string;
    status: CertificateStatus;
    fileHash: string;
    ipfsCid: string | null;
    cancellationReason: string | null;
    cancelledAt: string | null;
    blockchainTransaction: {
      txHash: string;
    } | null;
    history: Array<{
      action: CertificateHistoryAction;
      previousStatus: CertificateStatus | null;
      nextStatus: CertificateStatus;
      reason: string | null;
    }>;
  };
}

interface PublicVerifyResponse {
  isValid: boolean;
  message: string;
  certificate: {
    certificateNo: string;
    status: CertificateStatus;
    cancellationReason: string | null;
    history: Array<{
      action: CertificateHistoryAction;
    }>;
  };
}

interface DashboardResponse {
  overview: {
    suppliersTotal: number;
    batchesTotal: number;
    certificatesTotal: number;
  };
}

interface AuditLogsResponse {
  logs: Array<{
    action: AuditAction;
    entity: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface BatchesResponse {
  batches: Array<{
    batchNumber: string;
    _count: {
      certificates: number;
    };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface SuppliersResponse {
  suppliers: Array<{
    email: string;
    batchesTotal: number;
    certificatesTotal: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    suppliersTotal: number;
    activeSuppliers: number;
    blockedSuppliers: number;
    supplierCertificatesTotal: number;
  };
}

interface BatchDetailsResponse {
  batch: {
    id: string;
    batchNumber: string;
    certificates: Array<{
      certificateNo: string;
    }>;
    checks: Array<{
      isValid: boolean;
    }>;
  };
  verificationSummary: {
    total: number;
    failed: number;
  };
  auditLogs: Array<{
    action: AuditAction;
  }>;
}

let server: Server;
let baseUrl = "";
let supplierId = "";
let supplierToken = "";
let batchId = "";
let publicToken = "";
let certificateNo = "";
let adminToken = "";

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.blockchainTransaction.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.user.deleteMany();
}

async function request<T>(
  urlPath: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
  const body =
    response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

function jsonRequest(method: string, body: unknown, token?: string): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

async function getLatestTwoFactorCode() {
  const outbox = await fs.readFile(outboxFilePath, "utf8");
  const matches = [...outbox.matchAll(/code=(\d{6})/g)];
  const code = matches.at(-1)?.[1];

  assert.ok(code, "В файловом outbox должен быть записан 2FA-код");

  return code;
}

async function requestUntilRateLimited(
  urlPath: string,
  createInit: (attempt: number) => RequestInit,
  maxAttempts = 10
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request<ErrorResponse>(
      urlPath,
      createInit(attempt)
    );

    if (response.status === 429) {
      return response;
    }
  }

  throw new Error(`Маршрут ${urlPath} не вернул 429`);
}

before(async () => {
  await clearDatabase();
  await fs.rm(outboxFilePath, { force: true });

  await prisma.user.create({
    data: {
      name: "Integration Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 4),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      twoFactorEnabled: false,
    },
  });

  server = createApp().listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await prisma.$disconnect();
});

describe("VerMeat API integration", () => {
  it("returns API health status", async () => {
    const response = await request<{ status: string }>("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");

    const invalidTokenResponse = await request<ErrorResponse>("/api/batches", {
      headers: { Authorization: "Bearer invalid-access-token" },
    });

    assert.equal(invalidTokenResponse.status, 401);
    assert.match(invalidTokenResponse.body.message, /Недействительный токен/);
  });

  it("registers supplier and logs in with email 2FA", async () => {
    const registerResponse = await request<{
      user: { id: string; email: string };
      token?: string;
    }>(
      "/api/auth/register",
      jsonRequest("POST", {
        name: "Integration Supplier",
        companyName: "Integration Company",
        email: supplierEmail,
        password: supplierPassword,
      })
    );

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.user.email, supplierEmail);
    assert.equal(registerResponse.body.token, undefined);
    supplierId = registerResponse.body.user.id;

    const invalidChallengeResponse = await request<ErrorResponse>(
      "/api/auth/login/2fa",
      jsonRequest("POST", {
        challengeToken: "invalid-challenge-token",
        code: "000000",
      })
    );

    assert.equal(invalidChallengeResponse.status, 401);
    assert.match(
      invalidChallengeResponse.body.message,
      /Недействительный код подтверждения/
    );

    const loginResponse = await request<LoginChallengeResponse>(
      "/api/auth/login",
      jsonRequest("POST", {
        email: supplierEmail,
        password: supplierPassword,
      })
    );

    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.twoFactorRequired, true);
    assert.ok(loginResponse.body.challengeToken);

    const twoFactorResponse = await request<TokenResponse>(
      "/api/auth/login/2fa",
      jsonRequest("POST", {
        challengeToken: loginResponse.body.challengeToken,
        code: await getLatestTwoFactorCode(),
      })
    );

    assert.equal(twoFactorResponse.status, 200);
    assert.ok(twoFactorResponse.body.token);
    supplierToken = twoFactorResponse.body.token;

    const profileResponse = await request<{ user: { email: string } }>(
      "/api/auth/me",
      {
        headers: { Authorization: `Bearer ${supplierToken}` },
      }
    );

    assert.equal(profileResponse.status, 200);
    assert.equal(profileResponse.body.user.email, supplierEmail);
  });

  it("creates a supplier batch", async () => {
    const response = await request<BatchResponse>(
      "/api/batches",
      jsonRequest(
        "POST",
        {
          batchNumber: "TEST-BATCH-001",
          productName: "Боргойская баранина",
          originRegion: "Джидинский район",
          productionDate: "2026-05-30",
          weightKg: 125.5,
          description: "Интеграционный тест",
        },
        supplierToken
      )
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.batch.batchNumber, "TEST-BATCH-001");
    assert.ok(response.body.batch.publicToken);
    batchId = response.body.batch.id;
    publicToken = response.body.batch.publicToken;
  });

  it("uploads certificate in demo integration mode", async () => {
    const form = new FormData();

    certificateNo = "TEST-CERT-001";
    form.append("certificateNo", certificateNo);
    form.append("documentNumber", "DOC-TEST-001");
    form.append("authority", "Integration Laboratory");
    form.append(
      "file",
      new Blob(["integration certificate content"], {
        type: "application/pdf",
      }),
      "certificate.pdf"
    );

    const response = await request<CertificateResponse>(
      `/api/batches/${batchId}/certificates`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${supplierToken}` },
        body: form,
      }
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.certificate.certificateNo, certificateNo);
    assert.equal(response.body.certificate.status, CertificateStatus.CONFIRMED);
    assert.match(response.body.certificate.fileHash, /^[0-9a-f]{64}$/);
    assert.ok(response.body.certificate.ipfsCid);
    assert.match(
      response.body.certificate.blockchainTransaction?.txHash ?? "",
      /^0x[0-9a-f]{64}$/
    );
    assert.deepEqual(
      response.body.certificate.history.map((entry) => entry.action),
      [CertificateHistoryAction.CREATED]
    );
  });

  it("rejects unsupported certificate MIME type", async () => {
    const form = new FormData();

    form.append("certificateNo", "TEST-CERT-ZIP");
    form.append("documentNumber", "DOC-TEST-ZIP");
    form.append("authority", "Integration Laboratory");
    form.append(
      "file",
      new Blob(["unsupported certificate content"], {
        type: "application/zip",
      }),
      "certificate.zip"
    );

    const response = await request<ErrorResponse>(
      `/api/batches/${batchId}/certificates`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${supplierToken}` },
        body: form,
      }
    );

    assert.equal(response.status, 415);
    assert.match(response.body.message, /PDF, PNG или JPEG/);
    assert.equal(
      await prisma.certificate.count({
        where: { certificateNo: "TEST-CERT-ZIP" },
      }),
      0
    );
  });

  it("rejects certificates larger than 10 MB", async () => {
    const form = new FormData();

    form.append("certificateNo", "TEST-CERT-LARGE");
    form.append("documentNumber", "DOC-TEST-LARGE");
    form.append("authority", "Integration Laboratory");
    form.append(
      "file",
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {
        type: "application/pdf",
      }),
      "certificate-large.pdf"
    );

    const response = await request<ErrorResponse>(
      `/api/batches/${batchId}/certificates`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${supplierToken}` },
        body: form,
      }
    );

    assert.equal(response.status, 413);
    assert.match(response.body.message, /10 МБ/);
    assert.equal(
      await prisma.certificate.count({
        where: { certificateNo: "TEST-CERT-LARGE" },
      }),
      0
    );
  });

  it("verifies certificate by public QR token", async () => {
    const response = await request<PublicVerifyResponse>(
      `/api/public/verify/${publicToken}`
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.isValid, true);
    assert.equal(response.body.certificate.certificateNo, certificateNo);

    const storedVerification = await prisma.verificationResult.findFirst({
      where: {
        query: publicToken,
        isValid: true,
      },
    });

    assert.ok(storedVerification);
  });

  it("allows admin to inspect and update system data", async () => {
    const loginResponse = await request<TokenResponse>(
      "/api/auth/login",
      jsonRequest("POST", {
        email: adminEmail,
        password: adminPassword,
      })
    );

    assert.equal(loginResponse.status, 200);
    assert.ok(loginResponse.body.token);
    adminToken = loginResponse.body.token;

    const dashboardResponse = await request<DashboardResponse>(
      "/api/admin/dashboard",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(dashboardResponse.status, 200);
    assert.equal(dashboardResponse.body.overview.suppliersTotal, 1);
    assert.equal(dashboardResponse.body.overview.batchesTotal, 1);
    assert.equal(dashboardResponse.body.overview.certificatesTotal, 1);

    const statusResponse = await request<{
      services: {
        ipfs: { details: string };
        blockchain: { details: string };
      };
    }>("/api/admin/status", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(statusResponse.status, 200);
    assert.match(statusResponse.body.services.ipfs.details, /Demo-режим/);
    assert.match(statusResponse.body.services.blockchain.details, /Demo-режим/);

    const supplierResponse = await request<{ supplier: { status: UserStatus } }>(
      `/api/admin/suppliers/${supplierId}/status`,
      jsonRequest("PATCH", { status: UserStatus.PENDING }, adminToken)
    );

    assert.equal(supplierResponse.status, 200);
    assert.equal(supplierResponse.body.supplier.status, UserStatus.PENDING);

    const certificateResponse = await request<CertificateResponse>(
      `/api/admin/certificates/${certificateNo}/status`,
      jsonRequest(
        "PATCH",
        { status: CertificateStatus.MISMATCH },
        adminToken
      )
    );

    assert.equal(certificateResponse.status, 200);
    assert.equal(
      certificateResponse.body.certificate.status,
      CertificateStatus.MISMATCH
    );
    assert.deepEqual(
      certificateResponse.body.certificate.history.map((entry) => entry.action),
      [
        CertificateHistoryAction.STATUS_UPDATED,
        CertificateHistoryAction.CREATED,
      ]
    );

    const logsResponse = await request<AuditLogsResponse>(
      "/api/admin/audit-logs",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const actions = logsResponse.body.logs.map((log) => log.action);

    assert.equal(logsResponse.status, 200);
    assert.ok(actions.includes(AuditAction.USER_STATUS_UPDATED));
    assert.ok(actions.includes(AuditAction.CERTIFICATE_STATUS_UPDATED));
    assert.ok(actions.includes(AuditAction.CERTIFICATE_VERIFIED));
  });

  it("paginates and searches batches and suppliers", async () => {
    const activateSupplierResponse = await request<{
      supplier: { status: UserStatus };
    }>(
      `/api/admin/suppliers/${supplierId}/status`,
      jsonRequest("PATCH", { status: UserStatus.ACTIVE }, adminToken)
    );

    assert.equal(activateSupplierResponse.status, 200);
    assert.equal(
      activateSupplierResponse.body.supplier.status,
      UserStatus.ACTIVE
    );

    const secondBatchResponse = await request<BatchResponse>(
      "/api/batches",
      jsonRequest(
        "POST",
        {
          batchNumber: "TEST-BATCH-002",
          productName: "Боргойская баранина",
          originRegion: "Джидинский район",
          productionDate: "2026-05-31",
          weightKg: 95,
        },
        supplierToken
      )
    );

    assert.equal(secondBatchResponse.status, 201);

    const secondarySupplier = await prisma.user.create({
      data: {
        name: "Integration Secondary Supplier",
        companyName: "Integration Secondary Company",
        email: "secondary.integration@vermeat.test",
        passwordHash: await bcrypt.hash("secondary-password", 4),
        role: UserRole.SUPPLIER,
        status: UserStatus.ACTIVE,
      },
    });
    const secondarySupplierToken = signAccessToken({
      sub: secondarySupplier.id,
      role: secondarySupplier.role,
      email: secondarySupplier.email,
    });

    const batchPageResponse = await request<BatchesResponse>(
      "/api/batches?page=1&pageSize=1&query=TEST-BATCH",
      {
        headers: { Authorization: `Bearer ${supplierToken}` },
      }
    );

    assert.equal(batchPageResponse.status, 200);
    assert.equal(batchPageResponse.body.pagination.page, 1);
    assert.equal(batchPageResponse.body.pagination.pageSize, 1);
    assert.equal(batchPageResponse.body.pagination.total, 2);
    assert.equal(batchPageResponse.body.pagination.totalPages, 2);
    assert.equal(batchPageResponse.body.batches.length, 1);

    const supplierPageResponse = await request<SuppliersResponse>(
      "/api/admin/suppliers?page=1&pageSize=1&query=Integration",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(supplierPageResponse.status, 200);
    assert.equal(supplierPageResponse.body.pagination.page, 1);
    assert.equal(supplierPageResponse.body.pagination.pageSize, 1);
    assert.equal(supplierPageResponse.body.pagination.total, 2);
    assert.equal(supplierPageResponse.body.pagination.totalPages, 2);
    assert.equal(supplierPageResponse.body.suppliers.length, 1);
    assert.equal(supplierPageResponse.body.summary.suppliersTotal, 2);
    assert.equal(
      supplierPageResponse.body.summary.supplierCertificatesTotal,
      1
    );

    const detailResponse = await request<BatchDetailsResponse>(
      `/api/batches/${batchId}`,
      {
        headers: { Authorization: `Bearer ${supplierToken}` },
      }
    );

    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.batch.id, batchId);
    assert.equal(detailResponse.body.batch.batchNumber, "TEST-BATCH-001");
    assert.equal(detailResponse.body.batch.certificates.length, 1);
    assert.equal(
      detailResponse.body.batch.certificates[0]?.certificateNo,
      certificateNo
    );
    assert.ok(detailResponse.body.batch.checks.length >= 1);
    assert.ok(detailResponse.body.verificationSummary.total >= 1);
    assert.ok(
      detailResponse.body.auditLogs.some(
        (log) => log.action === AuditAction.BATCH_CREATED
      )
    );
    assert.ok(
      detailResponse.body.auditLogs.some(
        (log) => log.action === AuditAction.CERTIFICATE_UPLOADED
      )
    );

    const adminDetailResponse = await request<BatchDetailsResponse>(
      `/api/batches/${batchId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(adminDetailResponse.status, 200);

    const forbiddenDetailResponse = await request<ErrorResponse>(
      `/api/batches/${batchId}`,
      {
        headers: { Authorization: `Bearer ${secondarySupplierToken}` },
      }
    );

    assert.equal(forbiddenDetailResponse.status, 403);
  });

  it("cancels certificate without deleting evidence", async () => {
    const reason = "Документ отозван выдавшей лабораторией";
    const cancelResponse = await request<CertificateResponse>(
      `/api/admin/certificates/${certificateNo}/cancel`,
      jsonRequest("PATCH", { reason }, adminToken)
    );

    assert.equal(cancelResponse.status, 200);
    assert.equal(
      cancelResponse.body.certificate.status,
      CertificateStatus.CANCELLED
    );
    assert.equal(cancelResponse.body.certificate.cancellationReason, reason);
    assert.ok(cancelResponse.body.certificate.cancelledAt);
    assert.ok(cancelResponse.body.certificate.blockchainTransaction?.txHash);
    assert.deepEqual(
      cancelResponse.body.certificate.history.map((entry) => entry.action),
      [
        CertificateHistoryAction.CANCELLED,
        CertificateHistoryAction.STATUS_UPDATED,
        CertificateHistoryAction.CREATED,
      ]
    );
    assert.equal(cancelResponse.body.certificate.history[0]?.reason, reason);

    const storedCertificate = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: {
        blockchainTransaction: true,
        history: { orderBy: { createdAt: "desc" } },
      },
    });

    assert.equal(storedCertificate?.status, CertificateStatus.CANCELLED);
    assert.equal(storedCertificate?.cancellationReason, reason);
    assert.ok(storedCertificate?.blockchainTransaction);
    assert.equal(storedCertificate?.history.length, 3);

    const publicResponse = await request<PublicVerifyResponse>(
      `/api/public/verify/${publicToken}`
    );

    assert.equal(publicResponse.status, 200);
    assert.equal(publicResponse.body.isValid, false);
    assert.match(publicResponse.body.message, /Сертификат аннулирован/);
    assert.equal(
      publicResponse.body.certificate.status,
      CertificateStatus.CANCELLED
    );
    assert.equal(publicResponse.body.certificate.cancellationReason, reason);
    assert.equal(
      publicResponse.body.certificate.history[0]?.action,
      CertificateHistoryAction.CANCELLED
    );

    const restoreResponse = await request<{ message: string }>(
      `/api/admin/certificates/${certificateNo}/status`,
      jsonRequest(
        "PATCH",
        { status: CertificateStatus.CONFIRMED },
        adminToken
      )
    );

    assert.equal(restoreResponse.status, 409);

    const deleteResponse = await request<{ message: string }>(
      `/api/admin/certificates/${certificateNo}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(deleteResponse.status, 404);

    const cancellationAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: storedCertificate?.id,
        action: AuditAction.CERTIFICATE_CANCELLED,
      },
    });

    assert.ok(cancellationAudit);
  });

  it("filters and paginates audit logs", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const pageResponse = await request<AuditLogsResponse>(
      "/api/admin/audit-logs?page=1&pageSize=2&entity=Certificate",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(pageResponse.status, 200);
    assert.equal(pageResponse.body.pagination.page, 1);
    assert.equal(pageResponse.body.pagination.pageSize, 2);
    assert.ok(pageResponse.body.pagination.total >= 4);
    assert.equal(pageResponse.body.logs.length, 2);
    assert.ok(pageResponse.body.logs.every((log) => log.entity === "Certificate"));

    const filteredResponse = await request<AuditLogsResponse>(
      `/api/admin/audit-logs?page=1&pageSize=10&action=${AuditAction.CERTIFICATE_CANCELLED}&entity=Certificate&user=${adminEmail}&dateFrom=${today}&dateTo=${today}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(filteredResponse.status, 200);
    assert.equal(filteredResponse.body.pagination.total, 1);
    assert.equal(
      filteredResponse.body.logs[0]?.action,
      AuditAction.CERTIFICATE_CANCELLED
    );

    const secondPageResponse = await request<AuditLogsResponse>(
      "/api/admin/audit-logs?page=2&pageSize=1&entity=Certificate",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert.equal(secondPageResponse.status, 200);
    assert.equal(secondPageResponse.body.pagination.page, 2);
    assert.equal(secondPageResponse.body.logs.length, 1);
  });

  it("rate limits login, 2FA and public verification requests", async () => {
    const loginResponse = await requestUntilRateLimited(
      "/api/auth/login",
      () =>
        jsonRequest("POST", {
          email: "missing.integration@vermeat.test",
          password: "invalid-password",
        })
    );

    assert.match(loginResponse.body.message, /Слишком много попыток входа/);
    assert.ok(loginResponse.headers.get("retry-after"));

    const twoFactorResponse = await requestUntilRateLimited(
      "/api/auth/login/2fa",
      () => jsonRequest("POST", {})
    );

    assert.match(twoFactorResponse.body.message, /подтверждения 2FA/);
    assert.ok(twoFactorResponse.headers.get("retry-after"));

    const verifyResponse = await requestUntilRateLimited(
      "/api/public/verify?query=missing-rate-limit",
      () => ({})
    );

    assert.match(verifyResponse.body.message, /Слишком много запросов проверки/);
    assert.ok(verifyResponse.headers.get("retry-after"));
  });
});
