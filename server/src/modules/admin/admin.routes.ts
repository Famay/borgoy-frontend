import { Router } from "express";
import { z } from "zod";
import {
  AuditAction,
  CertificateStatus,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { getRouteParam } from "../../utils/request";

const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(80),
});

const updateCertificateStatusSchema = z.object({
  status: z.enum([
    CertificateStatus.PENDING,
    CertificateStatus.CONFIRMED,
    CertificateStatus.MISMATCH,
    CertificateStatus.BLOCKCHAIN_FAILED,
  ]),
});

const updateSupplierStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.PENDING, UserStatus.BLOCKED]),
});

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

function mapSupplierForAdmin(
  supplier: Awaited<ReturnType<typeof getSuppliersForAdmin>>[number]
) {
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

async function getSuppliersForAdmin() {
  return prisma.user.findMany({
    where: { role: UserRole.SUPPLIER },
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
  });
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
  const configured = Boolean(env.PINATA_JWT && env.PINATA_GATEWAY);

  return {
    status: configured ? "ok" : "warning",
    details: configured
      ? `Pinata gateway: ${env.PINATA_GATEWAY}`
      : "Pinata/IPFS не настроен полностью.",
  };
}

function getBlockchainStatus() {
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
  };
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
            in: [
              CertificateStatus.MISMATCH,
              CertificateStatus.BLOCKCHAIN_FAILED,
            ],
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
            in: [
              CertificateStatus.MISMATCH,
              CertificateStatus.BLOCKCHAIN_FAILED,
            ],
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
  asyncHandler(async (_req, res) => {
    const suppliers = await getSuppliersForAdmin();

    res.json({ suppliers: suppliers.map(mapSupplierForAdmin) });
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
            in: [
              CertificateStatus.MISMATCH,
              CertificateStatus.BLOCKCHAIN_FAILED,
            ],
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
    const { limit } = auditLogQuerySchema.parse(req.query);
    const logs = await prisma.auditLog.findMany({
      take: limit,
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
    });

    res.json({ logs });
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
      include: {
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
      },
    });

    if (!existing) {
      throw new HttpError(404, "Сертификат не найден");
    }

    const certificate = await prisma.certificate.update({
      where: { certificateNo },
      data: { status: payload.status },
      include: {
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
      },
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.CERTIFICATE_STATUS_UPDATED,
        entity: "Certificate",
        entityId: certificate.id,
        message: `Администратор изменил статус сертификата ${certificate.certificateNo}: ${existing.status} -> ${certificate.status}`,
        userId: admin.id,
        metadata: {
          certificateNo: certificate.certificateNo,
          previousStatus: existing.status,
          nextStatus: certificate.status,
        },
      },
    });

    res.json({ certificate });
  })
);

adminRouter.delete(
  "/certificates/:certificateNo",
  asyncHandler(async (req, res) => {
    const admin = req.user;

    if (!admin) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const certificateNo = getRouteParam(
      req.params.certificateNo,
      "certificateNo"
    );
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: {
        batch: {
          select: {
            batchNumber: true,
            productName: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new HttpError(404, "Сертификат не найден");
    }

    await prisma.certificate.delete({
      where: { certificateNo },
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.CERTIFICATE_DELETED,
        entity: "Certificate",
        entityId: certificate.id,
        message: `Администратор удалил сертификат ${certificate.certificateNo}`,
        userId: admin.id,
        metadata: {
          certificateNo: certificate.certificateNo,
          batchNumber: certificate.batch.batchNumber,
          productName: certificate.batch.productName,
          fileHash: certificate.fileHash,
        },
      },
    });

    res.status(204).send();
  })
);
