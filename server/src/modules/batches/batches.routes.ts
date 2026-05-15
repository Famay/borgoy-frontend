import { Router } from "express";
import { z } from "zod";
import { AuditAction, UserRole } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { createPublicToken } from "../../utils/hash";
import { HttpError } from "../../utils/httpError";

const createBatchSchema = z.object({
  batchNumber: z.string().min(3),
  productName: z.string().min(2),
  originRegion: z.string().min(3),
  productionDate: z.coerce.date(),
  weightKg: z.coerce.number().positive(),
  description: z.string().optional(),
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

    const where =
      user.role === UserRole.ADMIN ? {} : { supplierId: user.id };

    const batches = await prisma.batch.findMany({
      where,
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
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ batches });
  })
);

batchesRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.SUPPLIER, UserRole.ADMIN),
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
