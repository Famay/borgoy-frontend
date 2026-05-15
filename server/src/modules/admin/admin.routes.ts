import { Router } from "express";
import { z } from "zod";
import {
  AuditAction,
  CertificateStatus,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../db/prisma";
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

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

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
