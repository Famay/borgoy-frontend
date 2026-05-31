import { Router } from "express";
import { z } from "zod";
import {
  AuditAction,
  CertificateHistoryAction,
  CertificateStatus,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { getRouteParam } from "../../utils/request";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const supplierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || undefined)
    .optional(),
  status: z.enum(UserStatus).optional(),
});
const auditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    action: z.enum(AuditAction).optional(),
    entity: z
      .string()
      .trim()
      .max(100)
      .transform((value) => value || undefined)
      .optional(),
    user: z
      .string()
      .trim()
      .max(200)
      .transform((value) => value || undefined)
      .optional(),
    dateFrom: dateOnlySchema.optional(),
    dateTo: dateOnlySchema.optional(),
  })
  .refine(
    ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
    {
      message: "Начальная дата не может быть позже конечной",
      path: ["dateFrom"],
    }
  );

const updateCertificateStatusSchema = z.object({
  status: z.enum([
    CertificateStatus.PENDING,
    CertificateStatus.CONFIRMED,
    CertificateStatus.MISMATCH,
    CertificateStatus.BLOCKCHAIN_FAILED,
  ]),
});

const cancelCertificateSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

const updateSupplierStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.PENDING, UserStatus.BLOCKED]),
});

const problemCertificateStatuses = [
  CertificateStatus.MISMATCH,
  CertificateStatus.BLOCKCHAIN_FAILED,
  CertificateStatus.CANCELLED,
];

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

type SupplierForAdmin = Prisma.UserGetPayload<{
  include: {
    batches: {
      select: {
        id: true;
        batchNumber: true;
        productName: true;
        createdAt: true;
        _count: {
          select: {
            certificates: true;
          };
        };
      };
    };
  };
}>;

function mapSupplierForAdmin(supplier: SupplierForAdmin) {
  const certificatesTotal = supplier.batches.reduce(
    (total, batch) => total + batch._count.certificates,
    0
  );

  return {
    id: supplier.id,
    name: supplier.name,
    companyName: supplier.companyName,
    email: supplier.email,
    phone: supplier.phone,
    inn: supplier.inn,
    status: supplier.status,
    twoFactorEnabled: supplier.twoFactorEnabled,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    batchesTotal: supplier.batches.length,
    certificatesTotal,
    recentBatch: supplier.batches[0]
      ? {
          id: supplier.batches[0].id,
          batchNumber: supplier.batches[0].batchNumber,
          productName: supplier.batches[0].productName,
          createdAt: supplier.batches[0].createdAt,
        }
      : null,
  };
}

function getEmailStatus() {
  if (env.TWO_FACTOR_EMAIL_PROVIDER === "file") {
    return {
      status: "warning",
      details: "2FA-коды пишутся в локальный файл, письма не отправляются.",
    };
  }

  if (env.TWO_FACTOR_EMAIL_PROVIDER === "smtp") {
    const configured = Boolean(
      env.SMTP_HOST &&
        env.SMTP_USER &&
        env.SMTP_PASSWORD &&
        env.EMAIL_FROM
    );

    return {
      status: configured ? "ok" : "error",
      details: configured
        ? `SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT}, from ${env.EMAIL_FROM}`
        : "SMTP включен, но не заполнены SMTP_HOST, SMTP_USER, SMTP_PASSWORD или EMAIL_FROM.",
    };
  }

  const configured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

  return {
    status: configured ? "ok" : "error",
    details: configured
      ? `Resend настроен, from ${env.EMAIL_FROM}`
      : "Resend включен, но не заполнены RESEND_API_KEY или EMAIL_FROM.",
  };
}

function getIpfsStatus() {
  if (env.INTEGRATION_MODE === "demo") {
    return {
      status: "warning",
      details: "Demo-режим: файлы не загружаются в Pinata/IPFS.",
    };
  }

  const configured = Boolean(env.PINATA_JWT && env.PINATA_GATEWAY);

  return {
    status: configured ? "ok" : "warning",
    details: configured
      ? `Pinata gateway: ${env.PINATA_GATEWAY}`
      : "Pinata/IPFS не настроен полностью.",
  };
}

function getBlockchainStatus() {
  if (env.INTEGRATION_MODE === "demo") {
    return {
      status: "warning",
      details: "Demo-режим: транзакции не отправляются в Polygon Amoy.",
    };
  }

  const configured = Boolean(
    env.POLYGON_AMOY_RPC_URL &&
      env.POLYGON_PRIVATE_KEY &&
      env.CERTIFICATE_CONTRACT_ADDRESS
  );

  return {
    status: configured ? "ok" : "warning",
    details: configured
      ? `Polygon Amoy contract: ${env.CERTIFICATE_CONTRACT_ADDRESS}`
      : "Polygon Amoy не настроен полностью.",
  };
}

function getCertificateInclude() {
  return {
    batch: {
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
    },
    blockchainTransaction: true,
    history: {
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    },
  } as const;
}

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [
      usersTotal,
      suppliersTotal,
      activeUsers,
      batchesTotal,
      certificatesTotal,
      certificatesConfirmed,
      certificatesPending,
      certificatesWithProblems,
      verificationChecks,
      failedVerificationChecks,
      recentSuppliers,
      pendingCertificates,
      problemCertificates,
      failedVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.SUPPLIER } }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.batch.count(),
      prisma.certificate.count(),
      prisma.certificate.count({
        where: { status: CertificateStatus.CONFIRMED },
      }),
      prisma.certificate.count({
        where: { status: CertificateStatus.PENDING },
      }),
      prisma.certificate.count({
        where: {
          status: {
            in: problemCertificateStatuses,
          },
        },
      }),
      prisma.verificationResult.count(),
      prisma.verificationResult.count({ where: { isValid: false } }),
      prisma.user.findMany({
        where: { role: UserRole.SUPPLIER },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          batches: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              batchNumber: true,
              productName: true,
              createdAt: true,
              _count: {
                select: {
                  certificates: true,
                },
              },
            },
          },
        },
      }),
      prisma.certificate.findMany({
        where: { status: CertificateStatus.PENDING },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: getCertificateInclude(),
      }),
      prisma.certificate.findMany({
        where: {
          status: {
            in: problemCertificateStatuses,
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: getCertificateInclude(),
      }),
      prisma.verificationResult.findMany({
        where: { isValid: false },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          certificate: {
            select: {
              id: true,
              certificateNo: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              productName: true,
            },
          },
        },
      }),
    ]);

    res.json({
      overview: {
        usersTotal,
        suppliersTotal,
        activeUsers,
        batchesTotal,
        certificatesTotal,
        certificatesConfirmed,
        certificatesPending,
        certificatesWithProblems,
        verificationChecks,
        failedVerificationChecks,
      },
      recentSuppliers: recentSuppliers.map(mapSupplierForAdmin),
      pendingCertificates,
      problemCertificates,
      failedVerifications,
    });
  })
);

adminRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    let databaseStatus = {
      status: "ok",
      details: "PostgreSQL доступен.",
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = {
        status: "error",
        details: "PostgreSQL не ответил на health check.",
      };
    }

    const [
      usersTotal,
      suppliersTotal,
      batchesTotal,
      certificatesTotal,
      pendingCertificates,
      failedVerificationChecks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.SUPPLIER } }),
      prisma.batch.count(),
      prisma.certificate.count(),
      prisma.certificate.count({
        where: { status: CertificateStatus.PENDING },
      }),
      prisma.verificationResult.count({ where: { isValid: false } }),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      services: {
        database: databaseStatus,
        email: getEmailStatus(),
        ipfs: getIpfsStatus(),
        blockchain: getBlockchainStatus(),
        app: {
          status: "ok",
          details: `PUBLIC_APP_URL: ${env.PUBLIC_APP_URL}`,
        },
      },
      counts: {
        usersTotal,
        suppliersTotal,
        batchesTotal,
        certificatesTotal,
        pendingCertificates,
        failedVerificationChecks,
      },
    });
  })
);

adminRouter.get(
  "/suppliers",
  asyncHandler(async (req, res) => {
    const { page, pageSize, query, status } = supplierListQuerySchema.parse(
      req.query
    );
    const where: Prisma.UserWhereInput = {
      role: UserRole.SUPPLIER,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { companyName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { inn: { contains: query, mode: "insensitive" } },
              {
                batches: {
                  some: {
                    batchNumber: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const supplierWhere = { role: UserRole.SUPPLIER };
    const [
      suppliers,
      total,
      suppliersTotal,
      activeSuppliers,
      blockedSuppliers,
      supplierCertificatesTotal,
    ] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          batches: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              batchNumber: true,
              productName: true,
              createdAt: true,
              _count: {
                select: {
                  certificates: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: supplierWhere }),
      prisma.user.count({
        where: { ...supplierWhere, status: UserStatus.ACTIVE },
      }),
      prisma.user.count({
        where: { ...supplierWhere, status: UserStatus.BLOCKED },
      }),
      prisma.certificate.count({
        where: {
          batch: {
            supplier: supplierWhere,
          },
        },
      }),
    ]);

    res.json({
      suppliers: suppliers.map(mapSupplierForAdmin),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        suppliersTotal,
        activeSuppliers,
        blockedSuppliers,
        supplierCertificatesTotal,
      },
    });
  })
);

adminRouter.patch(
  "/suppliers/:supplierId/status",
  asyncHandler(async (req, res) => {
    const admin = req.user;

    if (!admin) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const supplierId = getRouteParam(req.params.supplierId, "supplierId");
    const payload = updateSupplierStatusSchema.parse(req.body);
    const supplier = await prisma.user.findFirst({
      where: {
        id: supplierId,
        role: UserRole.SUPPLIER,
      },
    });

    if (!supplier) {
      throw new HttpError(404, "Поставщик не найден");
    }

    const updatedSupplier = await prisma.user.update({
      where: { id: supplier.id },
      data: {
        status: payload.status,
        ...(payload.status === UserStatus.BLOCKED
          ? {
              twoFactorCodeHash: null,
              twoFactorCodeExpiresAt: null,
              twoFactorCodeAttempts: 0,
              twoFactorCodeSentAt: null,
            }
          : {}),
      },
      include: {
        batches: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            batchNumber: true,
            productName: true,
            createdAt: true,
            _count: {
              select: {
                certificates: true,
              },
            },
          },
        },
      },
    });

    if (supplier.status !== payload.status) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.USER_STATUS_UPDATED,
          entity: "User",
          entityId: supplier.id,
          message: `Администратор изменил статус поставщика ${supplier.email}: ${supplier.status} -> ${payload.status}`,
          userId: admin.id,
          metadata: {
            supplierEmail: supplier.email,
            previousStatus: supplier.status,
            nextStatus: payload.status,
          },
        },
      });
    }

    res.json({ supplier: mapSupplierForAdmin(updatedSupplier) });
  })
);

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [
      usersTotal,
      suppliersTotal,
      activeUsers,
      batchesTotal,
      certificatesTotal,
      certificatesConfirmed,
      certificatesPending,
      certificatesWithProblems,
      verificationChecks,
      failedVerificationChecks,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.SUPPLIER } }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.batch.count(),
      prisma.certificate.count(),
      prisma.certificate.count({
        where: { status: CertificateStatus.CONFIRMED },
      }),
      prisma.certificate.count({
        where: { status: CertificateStatus.PENDING },
      }),
      prisma.certificate.count({
        where: {
          status: {
            in: problemCertificateStatuses,
          },
        },
      }),
      prisma.verificationResult.count(),
      prisma.verificationResult.count({ where: { isValid: false } }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    res.json({
      overview: {
        usersTotal,
        suppliersTotal,
        activeUsers,
        batchesTotal,
        certificatesTotal,
        certificatesConfirmed,
        certificatesPending,
        certificatesWithProblems,
        verificationChecks,
        failedVerificationChecks,
      },
      recentLogs,
    });
  })
);

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { page, pageSize, action, entity, user, dateFrom, dateTo } =
      auditLogQuerySchema.parse(req.query);
    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(entity
        ? { entity: { contains: entity, mode: "insensitive" } }
        : {}),
      ...(user
        ? {
            user: {
              is: {
                OR: [
                  { name: { contains: user, mode: "insensitive" } },
                  { email: { contains: user, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom
                ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) }
                : {}),
              ...(dateTo
                ? { lte: new Date(`${dateTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);

adminRouter.patch(
  "/certificates/:certificateNo/status",
  asyncHandler(async (req, res) => {
    const admin = req.user;

    if (!admin) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const certificateNo = getRouteParam(
      req.params.certificateNo,
      "certificateNo"
    );
    const payload = updateCertificateStatusSchema.parse(req.body);
    const existing = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: getCertificateInclude(),
    });

    if (!existing) {
      throw new HttpError(404, "Сертификат не найден");
    }

    if (existing.status === CertificateStatus.CANCELLED) {
      throw new HttpError(409, "Аннулированный сертификат нельзя восстановить");
    }

    if (existing.status === payload.status) {
      res.json({ certificate: existing });
      return;
    }

    const certificate = await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { certificateNo },
        data: { status: payload.status },
      });

      await tx.certificateHistory.create({
        data: {
          action: CertificateHistoryAction.STATUS_UPDATED,
          certificateId: existing.id,
          previousStatus: existing.status,
          nextStatus: payload.status,
          message: `Администратор изменил статус сертификата ${existing.certificateNo}: ${existing.status} -> ${payload.status}`,
          changedById: admin.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CERTIFICATE_STATUS_UPDATED,
          entity: "Certificate",
          entityId: existing.id,
          message: `Администратор изменил статус сертификата ${existing.certificateNo}: ${existing.status} -> ${payload.status}`,
          userId: admin.id,
          metadata: {
            certificateNo: existing.certificateNo,
            previousStatus: existing.status,
            nextStatus: payload.status,
          },
        },
      });

      return tx.certificate.findUniqueOrThrow({
        where: { certificateNo },
        include: getCertificateInclude(),
      });
    });

    res.json({ certificate });
  })
);

adminRouter.patch(
  "/certificates/:certificateNo/cancel",
  asyncHandler(async (req, res) => {
    const admin = req.user;

    if (!admin) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const certificateNo = getRouteParam(
      req.params.certificateNo,
      "certificateNo"
    );
    const payload = cancelCertificateSchema.parse(req.body);
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: getCertificateInclude(),
    });

    if (!certificate) {
      throw new HttpError(404, "Сертификат не найден");
    }

    if (certificate.status === CertificateStatus.CANCELLED) {
      throw new HttpError(409, "Сертификат уже аннулирован");
    }

    const cancelledAt = new Date();
    const cancelledCertificate = await prisma.$transaction(async (tx) => {
      const updatedCertificate = await tx.certificate.update({
        where: { certificateNo },
        data: {
          status: CertificateStatus.CANCELLED,
          cancellationReason: payload.reason,
          cancelledAt,
          cancelledById: admin.id,
        },
      });

      await tx.certificateHistory.create({
        data: {
          action: CertificateHistoryAction.CANCELLED,
          certificateId: certificate.id,
          previousStatus: certificate.status,
          nextStatus: CertificateStatus.CANCELLED,
          message: `Администратор аннулировал сертификат ${certificate.certificateNo}`,
          reason: payload.reason,
          changedById: admin.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CERTIFICATE_CANCELLED,
          entity: "Certificate",
          entityId: certificate.id,
          message: `Администратор аннулировал сертификат ${certificate.certificateNo}`,
          userId: admin.id,
          metadata: {
            certificateNo: certificate.certificateNo,
            batchNumber: certificate.batch.batchNumber,
            productName: certificate.batch.productName,
            fileHash: certificate.fileHash,
            previousStatus: certificate.status,
            reason: payload.reason,
            cancelledAt: cancelledAt.toISOString(),
          },
        },
      });

      return tx.certificate.findUniqueOrThrow({
        where: { id: updatedCertificate.id },
        include: getCertificateInclude(),
      });
    });

    res.json({ certificate: cancelledCertificate });
  })
);
