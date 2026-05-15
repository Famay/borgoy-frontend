import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../server/generated/prisma/client";
import {
  AuditAction,
  CertificateStatus,
  UserRole,
} from "../server/generated/prisma/enums";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is required for prisma seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("supplier123", 12);
  const adminPasswordHash = await bcrypt.hash("admin123", 12);

  const supplier = await prisma.user.upsert({
    where: { email: "supplier@vermeat.ru" },
    update: {},
    create: {
      name: "Андрей Иванов",
      companyName: "ООО «Боргойский продукт»",
      email: "supplier@vermeat.ru",
      phone: "+7 (999) 123-45-67",
      inn: "0300000000",
      passwordHash,
      role: UserRole.SUPPLIER,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@vermeat.ru" },
    update: {},
    create: {
      name: "Администратор VerMeat",
      email: "admin@vermeat.ru",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const batch = await prisma.batch.upsert({
    where: { batchNumber: "BORG-2026-0241" },
    update: {},
    create: {
      batchNumber: "BORG-2026-0241",
      productName: "Боргойская баранина",
      originRegion: "Боргойская степь, Джидинский район, Республика Бурятия",
      productionDate: new Date("2026-04-12"),
      weightKg: new Prisma.Decimal(320),
      description: "Демонстрационная партия боргойской баранины",
      publicToken: "borg-2026-0241",
      supplierId: supplier.id,
    },
  });

  await prisma.certificate.upsert({
    where: { certificateNo: "CERT-2026-001" },
    update: {},
    create: {
      certificateNo: "CERT-2026-001",
      documentNumber: "VET-BRG-2026-0418",
      authority: "Лаборатория ветеринарного контроля",
      description: "Сертификат качества и происхождения продукции",
      issueDate: new Date("2026-04-18"),
      status: CertificateStatus.CONFIRMED,
      fileName: "cert-borg-0241.pdf",
      fileMimeType: "application/pdf",
      fileSize: 842240,
      fileHash:
        "91f5e2c8a7b14f0c2bb1eaa09f6a4e7d0a4e3c5d7b86a29a2e46d0d1c6e18f",
      ipfsCid: "bafybeigdyrztdemo0241",
      qrPayload: "http://127.0.0.1:5173/verify?token=borg-2026-0241",
      batchId: batch.id,
      blockchainTransaction: {
        create: {
          txHash: "0xA71C29D8F2B4C9E15B79E6A412C83D5B91EF",
          network: "polygon-amoy",
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_REGISTERED,
      entity: "Seed",
      message: "Seed-данные VerMeat загружены",
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
