import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import {
  AuditAction,
  CertificateStatus,
  UserRole,
} from "../../../generated/prisma/enums";
import { prisma } from "../../db/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { registerCertificateOnChain } from "../../services/blockchain.service";
import { uploadCertificateToIpfs } from "../../services/ipfs.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { sha256 } from "../../utils/hash";
import { HttpError } from "../../utils/httpError";
import { createPublicVerifyUrl, createQrCodeDataUrl } from "../../utils/qr";
import { getRouteParam } from "../../utils/request";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const certificateBodySchema = z.object({
  certificateNo: z.string().min(3).optional(),
  documentNumber: z.string().min(2),
  authority: z.string().min(2),
  description: z.string().optional(),
});

const fileHashQuerySchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{64}$/i),
});

export const certificatesRouter = Router();

certificatesRouter.get(
  "/certificates",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : { batch: { supplierId: user.id } };

    const certificates = await prisma.certificate.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    res.json({ certificates });
  })
);

certificatesRouter.get(
  "/certificates/check-file",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hash } = fileHashQuerySchema.parse(req.query);
    const fileHash = hash.toLowerCase();
    const certificate = await prisma.certificate.findFirst({
      where: { fileHash },
      include: {
        batch: {
          select: {
            batchNumber: true,
            productName: true,
          },
        },
      },
    });

    res.json({
      exists: certificate !== null,
      certificate: certificate
        ? {
            certificateNo: certificate.certificateNo,
            batchNumber: certificate.batch.batchNumber,
            productName: certificate.batch.productName,
          }
        : null,
    });
  })
);

certificatesRouter.get(
  "/certificates/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const certificateId = getRouteParam(req.params.id, "id");
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new HttpError(404, "Сертификат не найден");
    }

    const batch = await prisma.batch.findUnique({
      where: { id: certificate.batchId },
    });
    const blockchainTransaction = await prisma.blockchainTransaction.findUnique({
      where: { certificateId: certificate.id },
    });

    if (!batch) {
      throw new HttpError(404, "Партия сертификата не найдена");
    }

    if (user.role !== UserRole.ADMIN && batch.supplierId !== user.id) {
      throw new HttpError(403, "Недостаточно прав");
    }

    res.json({ certificate: { ...certificate, batch, blockchainTransaction } });
  })
);

certificatesRouter.post(
  "/batches/:batchId/certificates",
  requireAuth,
  requireRole(UserRole.SUPPLIER, UserRole.ADMIN),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const batchId = getRouteParam(req.params.batchId, "batchId");

    if (!req.file) {
      throw new HttpError(400, "Файл сертификата обязателен");
    }

    const payload = certificateBodySchema.parse(req.body);
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new HttpError(404, "Партия не найдена");
    }

    if (user.role !== UserRole.ADMIN && batch.supplierId !== user.id) {
      throw new HttpError(403, "Недостаточно прав");
    }

    const certificateNo =
      payload.certificateNo ??
      `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const fileHash = sha256(req.file.buffer);
    const duplicateCertificate = await prisma.certificate.findFirst({
      where: { fileHash },
      include: {
        batch: {
          select: {
            batchNumber: true,
            productName: true,
          },
        },
      },
    });

    if (duplicateCertificate) {
      throw new HttpError(
        409,
        `Этот файл уже загружен как сертификат ${duplicateCertificate.certificateNo} для партии ${duplicateCertificate.batch.batchNumber}. Загрузите другой файл.`
      );
    }

    const ipfsUpload = await uploadCertificateToIpfs({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileHash,
      certificateNo,
      batchNumber: batch.batchNumber,
    });
    const blockchainRegistration = await registerCertificateOnChain({
      certificateNo,
      fileHash,
      ipfsCid: ipfsUpload.cid,
    });
    const qrPayload = createPublicVerifyUrl(batch.publicToken);
    const qrCodeDataUrl = await createQrCodeDataUrl(qrPayload);

    const certificate = await prisma.certificate.create({
      data: {
        certificateNo,
        documentNumber: payload.documentNumber,
        authority: payload.authority,
        description: payload.description,
        status: CertificateStatus.CONFIRMED,
        fileName: req.file.originalname,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileHash,
        ipfsCid: ipfsUpload.cid,
        qrPayload,
        qrCodeDataUrl,
        batchId: batch.id,
        blockchainTransaction: {
          create: {
            txHash: blockchainRegistration.txHash,
            blockNumber: blockchainRegistration.blockNumber,
            contract: blockchainRegistration.contract,
          },
        },
      },
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
        action: AuditAction.CERTIFICATE_UPLOADED,
        entity: "Certificate",
        entityId: certificate.id,
        message: `Загружен сертификат ${certificate.certificateNo}`,
        userId: user.id,
        metadata: {
          fileName: req.file.originalname,
          fileHash,
          ipfsCid: ipfsUpload.cid,
          ipfsProvider: ipfsUpload.provider,
          ipfsGatewayUrl: ipfsUpload.gatewayUrl,
          txHash: blockchainRegistration.txHash,
          blockchainProvider: blockchainRegistration.provider,
        },
      },
    });

    res.status(201).json({ certificate });
  })
);
