import { Router } from "express";
import { z } from "zod";
import { AuditAction, CertificateStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { verifyCertificateOnChain } from "../../services/blockchain.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRouteParam } from "../../utils/request";

const verifyQuerySchema = z.object({
  query: z.string().optional(),
  batchNumber: z.string().optional(),
  certificateNo: z.string().optional(),
});

export const publicRouter = Router();

publicRouter.get(
  "/verify/:token",
  asyncHandler(async (req, res) => {
    const token = getRouteParam(req.params.token, "token");
    const result = await verifyCertificate({
      publicToken: token,
      query: token,
    });

    res.status(result.httpStatus).json(result.body);
  })
);

publicRouter.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const query = verifyQuerySchema.parse(req.query);
    const lookupValue = query.query ?? query.batchNumber ?? query.certificateNo ?? "";
    const result = await verifyCertificate({
      queryAll: query.query,
      batchNumber: query.batchNumber,
      certificateNo: query.certificateNo,
      query: lookupValue,
    });

    res.status(result.httpStatus).json(result.body);
  })
);

interface VerifyCertificateInput {
  queryAll?: string;
  publicToken?: string;
  batchNumber?: string;
  certificateNo?: string;
  query: string;
}

async function verifyCertificate(input: VerifyCertificateInput) {
  const orFilters: Prisma.CertificateWhereInput[] = [];
  const queryAll = input.queryAll?.trim();

  if (queryAll) {
    orFilters.push(
      { certificateNo: { equals: queryAll, mode: "insensitive" } },
      { batch: { batchNumber: { equals: queryAll, mode: "insensitive" } } },
      { batch: { publicToken: { equals: queryAll, mode: "insensitive" } } }
    );
  }

  if (input.certificateNo) {
    orFilters.push({
      certificateNo: { equals: input.certificateNo, mode: "insensitive" },
    });
  }

  if (input.batchNumber) {
    orFilters.push({
      batch: { batchNumber: { equals: input.batchNumber, mode: "insensitive" } },
    });
  }

  if (input.publicToken) {
    orFilters.push({
      batch: { publicToken: { equals: input.publicToken, mode: "insensitive" } },
    });
  }

  if (orFilters.length === 0) {
    return {
      httpStatus: 400,
      body: {
        isValid: false,
        message: "Передайте QR-токен, номер партии или номер сертификата",
      },
    };
  }

  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: orFilters,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!certificate) {
    await prisma.verificationResult.create({
      data: {
        query: input.query,
        isValid: false,
        message: "Запись не найдена",
      },
    });

    return {
      httpStatus: 404,
      body: {
        isValid: false,
        message: "Запись не найдена",
      },
    };
  }

  const batch = await prisma.batch.findUnique({
    where: { id: certificate.batchId },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
    },
  });
  const blockchainTransaction = await prisma.blockchainTransaction.findUnique({
    where: { certificateId: certificate.id },
  });

  if (!batch) {
    return {
      httpStatus: 404,
      body: {
        isValid: false,
        message: "Партия сертификата не найдена",
      },
    };
  }

  const blockchainCheck = await verifyCertificateOnChain({
    certificateNo: certificate.certificateNo,
    fileHash: certificate.fileHash,
    hasTransaction: Boolean(blockchainTransaction),
  });
  const blockchainHash = blockchainCheck.blockchainHash;
  const isValid =
    certificate.status === CertificateStatus.CONFIRMED &&
    blockchainCheck.isValid;
  const message = isValid
    ? "Сертификат подтвержден"
    : "Подлинность сертификата не подтверждена";

  await prisma.verificationResult.create({
    data: {
      query: input.query,
      isValid,
      message,
      localHash: certificate.fileHash,
      blockchainHash,
      batchId: certificate.batchId,
      certificateId: certificate.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: isValid
        ? AuditAction.CERTIFICATE_VERIFIED
        : AuditAction.VERIFICATION_FAILED,
      entity: "Certificate",
      entityId: certificate.id,
      message,
      metadata: {
        query: input.query,
        blockchainProvider: blockchainCheck.provider,
      },
    },
  });

  return {
    httpStatus: 200,
    body: {
      isValid,
      message,
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        originRegion: batch.originRegion,
        productionDate: batch.productionDate,
        weightKg: batch.weightKg,
        publicToken: batch.publicToken,
        supplier: batch.supplier,
      },
      certificate: {
        id: certificate.id,
        certificateNo: certificate.certificateNo,
        documentNumber: certificate.documentNumber,
        authority: certificate.authority,
        description: certificate.description,
        issueDate: certificate.issueDate,
        status: certificate.status,
        fileName: certificate.fileName,
        fileSize: certificate.fileSize,
        fileHash: certificate.fileHash,
        ipfsCid: certificate.ipfsCid,
        qrPayload: certificate.qrPayload,
        qrCodeDataUrl: certificate.qrCodeDataUrl,
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          productName: batch.productName,
          originRegion: batch.originRegion,
          productionDate: batch.productionDate,
          weightKg: batch.weightKg,
          publicToken: batch.publicToken,
          supplier: batch.supplier,
        },
        blockchainTransaction,
      },
    },
  };
}
