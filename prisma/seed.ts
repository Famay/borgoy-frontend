import "dotenv/config";
import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../server/generated/prisma/client";
import {
  AuditAction,
  CertificateStatus,
  UserRole,
  UserStatus,
} from "../server/generated/prisma/enums";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is required for prisma seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const publicAppUrl = (process.env["PUBLIC_APP_URL"] ?? "http://127.0.0.1:5173")
  .replace(/\/$/, "");
const contractAddress =
  process.env["CERTIFICATE_CONTRACT_ADDRESS"] ??
  "0xA3881c6e65a0eEe7E0d202639aC3c8aaA4b11f06";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function verifyUrl(token: string) {
  return `${publicAppUrl}/verify?token=${token}`;
}

function demoTx(seed: number) {
  return `0x${seed.toString(16).padStart(64, "0")}`;
}

async function main() {
  const passwordHash = await bcrypt.hash("supplier123", 12);
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const adminEmail = "voroninandrey2005@gmail.com";

  const supplierData = [
    {
      key: "borgoy",
      name: "Андрей Иванов",
      companyName: "ООО «Боргойский продукт»",
      email: "supplier@vermeat.ru",
      phone: "+7 (999) 123-45-67",
      inn: "0300000000",
      status: UserStatus.ACTIVE,
    },
    {
      key: "steppe",
      name: "Батор Цыденов",
      companyName: "КФХ «Степной двор»",
      email: "steppe@vermeat.ru",
      phone: "+7 (924) 210-44-19",
      inn: "0326011122",
      status: UserStatus.ACTIVE,
    },
    {
      key: "standard",
      name: "Елена Смирнова",
      companyName: "ООО «Мясной стандарт»",
      email: "standard@vermeat.ru",
      phone: "+7 (3012) 55-10-77",
      inn: "0327009988",
      status: UserStatus.PENDING,
    },
    {
      key: "blocked",
      name: "Сергей Петров",
      companyName: "ИП Петров С. В.",
      email: "blocked@vermeat.ru",
      phone: "+7 (902) 166-90-11",
      inn: "0326014455",
      status: UserStatus.BLOCKED,
    },
  ];

  const suppliers = new Map<string, { id: string }>();

  for (const supplier of supplierData) {
    const user = await prisma.user.upsert({
      where: { email: supplier.email },
      update: {
        name: supplier.name,
        companyName: supplier.companyName,
        phone: supplier.phone,
        inn: supplier.inn,
        status: supplier.status,
        twoFactorEnabled: true,
      },
      create: {
        name: supplier.name,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        inn: supplier.inn,
        passwordHash,
        role: UserRole.SUPPLIER,
        status: supplier.status,
        twoFactorEnabled: true,
      },
      select: { id: true },
    });

    suppliers.set(supplier.key, user);
  }

  const adminWithNewEmail = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminWithNewEmail) {
    await prisma.user.updateMany({
      where: { email: "admin@vermeat.ru" },
      data: { email: adminEmail },
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Администратор VerMeat",
      phone: "+7 (999) 765-43-21",
      status: UserStatus.ACTIVE,
      twoFactorEnabled: false,
    },
    create: {
      name: "Администратор VerMeat",
      email: adminEmail,
      phone: "+7 (999) 765-43-21",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      twoFactorEnabled: false,
    },
  });

  const batchData = [
    {
      key: "borg-0241",
      supplierKey: "borgoy",
      batchNumber: "BORG-2026-0241",
      productName: "Боргойская баранина",
      originRegion: "Боргойская степь, Джидинский район, Республика Бурятия",
      productionDate: "2026-04-12",
      weightKg: 320,
      description: "Демонстрационная партия охлажденной баранины.",
      publicToken: "borg-2026-0241",
    },
    {
      key: "borg-0256",
      supplierKey: "borgoy",
      batchNumber: "BORG-2026-0256",
      productName: "Бараньи полуфабрикаты",
      originRegion: "Джидинский район, Республика Бурятия",
      productionDate: "2026-04-26",
      weightKg: 185,
      description: "Партия с сертификатом, ожидающим ручного подтверждения.",
      publicToken: "borg-2026-0256",
    },
    {
      key: "steppe-0107",
      supplierKey: "steppe",
      batchNumber: "STEP-2026-0107",
      productName: "Говядина степная",
      originRegion: "Иволгинский район, Республика Бурятия",
      productionDate: "2026-05-02",
      weightKg: 540,
      description: "Партия с записью в IPFS и Polygon Amoy.",
      publicToken: "step-2026-0107",
    },
    {
      key: "standard-0034",
      supplierKey: "standard",
      batchNumber: "STD-2026-0034",
      productName: "Колбасная продукция",
      originRegion: "Улан-Удэ, Республика Бурятия",
      productionDate: "2026-05-08",
      weightKg: 210,
      description: "Партия поставщика со статусом ожидания.",
      publicToken: "std-2026-0034",
    },
  ];

  const batches = new Map<string, { id: string; publicToken: string }>();

  for (const batch of batchData) {
    const supplier = suppliers.get(batch.supplierKey);

    if (!supplier) {
      throw new Error(`Unknown supplier key: ${batch.supplierKey}`);
    }

    const createdBatch = await prisma.batch.upsert({
      where: { batchNumber: batch.batchNumber },
      update: {
        productName: batch.productName,
        originRegion: batch.originRegion,
        productionDate: new Date(batch.productionDate),
        weightKg: new Prisma.Decimal(batch.weightKg),
        description: batch.description,
        publicToken: batch.publicToken,
        supplierId: supplier.id,
      },
      create: {
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        originRegion: batch.originRegion,
        productionDate: new Date(batch.productionDate),
        weightKg: new Prisma.Decimal(batch.weightKg),
        description: batch.description,
        publicToken: batch.publicToken,
        supplierId: supplier.id,
      },
      select: { id: true, publicToken: true },
    });

    batches.set(batch.key, createdBatch);
  }

  const certificateData = [
    {
      certificateNo: "CERT-2026-001",
      batchKey: "borg-0241",
      documentNumber: "VET-BRG-2026-0418",
      authority: "Лаборатория ветеринарного контроля",
      description: "Сертификат качества и происхождения продукции.",
      issueDate: "2026-04-18",
      status: CertificateStatus.CONFIRMED,
      fileName: "cert-borg-0241.pdf",
      fileSize: 842240,
      ipfsCid: "bafybeigdyrztdemo0241",
      txHash: demoTx(241),
      blockNumber: 11824531,
    },
    {
      certificateNo: "CERT-2026-002",
      batchKey: "borg-0256",
      documentNumber: "VET-BRG-2026-0501",
      authority: "Республиканская ветлаборатория",
      description: "Сертификат ожидает ручного подтверждения администратором.",
      issueDate: "2026-05-01",
      status: CertificateStatus.PENDING,
      fileName: "cert-borg-0256.pdf",
      fileSize: 515120,
      ipfsCid: null,
      txHash: null,
      blockNumber: null,
    },
    {
      certificateNo: "CERT-2026-003",
      batchKey: "steppe-0107",
      documentNumber: "VET-STP-2026-0506",
      authority: "Иволгинская ветеринарная станция",
      description: "Подтвержденный сертификат с blockchain-записью.",
      issueDate: "2026-05-06",
      status: CertificateStatus.CONFIRMED,
      fileName: "cert-steppe-0107.pdf",
      fileSize: 734480,
      ipfsCid: "bafybeigdyrztdemo0107",
      txHash: demoTx(107),
      blockNumber: 11830244,
    },
    {
      certificateNo: "CERT-2026-004",
      batchKey: "standard-0034",
      documentNumber: "DECL-STD-2026-0510",
      authority: "Испытательный центр пищевой продукции",
      description: "Демонстрационный сертификат с расхождением данных.",
      issueDate: "2026-05-10",
      status: CertificateStatus.MISMATCH,
      fileName: "cert-standard-0034.pdf",
      fileSize: 428900,
      ipfsCid: "bafybeigdyrztdemo0034",
      txHash: demoTx(34),
      blockNumber: 11840192,
    },
    {
      certificateNo: "CERT-2026-005",
      batchKey: "steppe-0107",
      documentNumber: "LAB-STP-2026-0507",
      authority: "Лаборатория качества мясной продукции",
      description: "Сертификат, где имитирована ошибка записи в blockchain.",
      issueDate: "2026-05-07",
      status: CertificateStatus.BLOCKCHAIN_FAILED,
      fileName: "cert-steppe-0107-lab.pdf",
      fileSize: 391640,
      ipfsCid: "bafybeigdyrztdemo0107lab",
      txHash: null,
      blockNumber: null,
    },
  ];

  for (const certificate of certificateData) {
    const batch = batches.get(certificate.batchKey);

    if (!batch) {
      throw new Error(`Unknown batch key: ${certificate.batchKey}`);
    }

    const savedCertificate = await prisma.certificate.upsert({
      where: { certificateNo: certificate.certificateNo },
      update: {
        documentNumber: certificate.documentNumber,
        authority: certificate.authority,
        description: certificate.description,
        issueDate: new Date(certificate.issueDate),
        status: certificate.status,
        fileName: certificate.fileName,
        fileMimeType: "application/pdf",
        fileSize: certificate.fileSize,
        fileHash: sha256(certificate.certificateNo),
        ipfsCid: certificate.ipfsCid,
        qrPayload: verifyUrl(batch.publicToken),
        batchId: batch.id,
      },
      create: {
        certificateNo: certificate.certificateNo,
        documentNumber: certificate.documentNumber,
        authority: certificate.authority,
        description: certificate.description,
        issueDate: new Date(certificate.issueDate),
        status: certificate.status,
        fileName: certificate.fileName,
        fileMimeType: "application/pdf",
        fileSize: certificate.fileSize,
        fileHash: sha256(certificate.certificateNo),
        ipfsCid: certificate.ipfsCid,
        qrPayload: verifyUrl(batch.publicToken),
        batchId: batch.id,
      },
      select: { id: true },
    });

    if (certificate.txHash) {
      await prisma.blockchainTransaction.upsert({
        where: { certificateId: savedCertificate.id },
        update: {
          network: "polygon-amoy",
          contract: contractAddress,
          txHash: certificate.txHash,
          blockNumber: certificate.blockNumber,
        },
        create: {
          network: "polygon-amoy",
          contract: contractAddress,
          txHash: certificate.txHash,
          blockNumber: certificate.blockNumber,
          certificateId: savedCertificate.id,
        },
      });
    }
  }

  await prisma.verificationResult.deleteMany({
    where: {
      query: {
        in: [
          "borg-2026-0241",
          "step-2026-0107",
          "unknown-demo-token",
          "CERT-2026-004",
        ],
      },
    },
  });

  await prisma.verificationResult.createMany({
    data: [
      {
        query: "borg-2026-0241",
        isValid: true,
        message: "Сертификат найден и подтвержден.",
      },
      {
        query: "step-2026-0107",
        isValid: true,
        message: "Партия найдена, сертификат подтвержден в Polygon Amoy.",
      },
      {
        query: "unknown-demo-token",
        isValid: false,
        message: "Запись не найдена.",
      },
      {
        query: "CERT-2026-004",
        isValid: false,
        message: "Обнаружено расхождение данных сертификата.",
      },
    ],
  });

  await prisma.auditLog.deleteMany({ where: { entity: "Seed" } });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_REGISTERED,
      entity: "Seed",
      message: "Seed-данные VerMeat загружены: поставщики, партии, сертификаты, проверки.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
