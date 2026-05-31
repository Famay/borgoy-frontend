import { Router } from "express";
import { z } from "zod";
import { AuditAction, UserRole } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { createPublicToken } from "../../utils/hash";
import { HttpError } from "../../utils/httpError";
import { getRouteParam } from "../../utils/request";

const createBatchSchema = z.object({
  batchNumber: z.string().min(3),
  productName: z.string().min(2),
  originRegion: z.string().min(3),
  productionDate: z.coerce.date(),
  weightKg: z.coerce.number().positive(),
  description: z.string().optional(),
});
const batchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || undefined)
    .optional(),
});

export const batchesRouter = Router();

batchesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const { page, pageSize, query } = batchListQuerySchema.parse(req.query);
    const accessWhere: Prisma.BatchWhereInput =
      user.role === UserRole.ADMIN ? {} : { supplierId: user.id };
    const where: Prisma.BatchWhereInput = {
      ...accessWhere,
      ...(query
        ? {
            OR: [
              { batchNumber: { contains: query, mode: "insensitive" } },
              { productName: { contains: query, mode: "insensitive" } },
              { originRegion: { contains: query, mode: "insensitive" } },
              {
                supplier: {
                  is: {
                    OR: [
                      { name: { contains: query, mode: "insensitive" } },
                      {
                        companyName: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
            },
          },
          _count: {
            select: {
              certificates: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.batch.count({ where }),
    ]);

    res.json({
      batches,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);

batchesRouter.get(
  "/:batchId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const batchId = getRouteParam(req.params.batchId, "batchId");
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
        certificates: {
          include: {
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
          },
          orderBy: { createdAt: "desc" },
        },
        checks: {
          include: {
            certificate: {
              select: {
                id: true,
                certificateNo: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: {
            checks: true,
          },
        },
      },
    });

    if (!batch) {
      throw new HttpError(404, "Партия не найдена");
    }

    if (user.role !== UserRole.ADMIN && batch.supplierId !== user.id) {
      throw new HttpError(403, "Недостаточно прав");
    }

    const certificateIds = batch.certificates.map(
      (certificate) => certificate.id
    );
    const [failedVerificationChecks, auditLogs] = await Promise.all([
      prisma.verificationResult.count({
        where: {
          batchId: batch.id,
          isValid: false,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            {
              entity: "Batch",
              entityId: batch.id,
            },
            ...(certificateIds.length > 0
              ? [
                  {
                    entity: "Certificate",
                    entityId: { in: certificateIds },
                  },
                ]
              : []),
          ],
        },
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
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    res.json({
      batch,
      verificationSummary: {
        total: batch._count.checks,
        failed: failedVerificationChecks,
      },
      auditLogs,
    });
  })
);

batchesRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.SUPPLIER),
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const payload = createBatchSchema.parse(req.body);
    const publicToken = createPublicToken(payload.batchNumber);

    const batch = await prisma.batch.create({
      data: {
        batchNumber: payload.batchNumber,
        productName: payload.productName,
        originRegion: payload.originRegion,
        productionDate: payload.productionDate,
        weightKg: new Prisma.Decimal(payload.weightKg),
        description: payload.description,
        publicToken,
        supplierId: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.BATCH_CREATED,
        entity: "Batch",
        entityId: batch.id,
        message: `Создана партия ${batch.batchNumber}`,
        userId: user.id,
      },
    });

    res.status(201).json({ batch });
  })
);
