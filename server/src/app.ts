import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client";
import { env } from "./config/env";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { batchesRouter } from "./modules/batches/batches.routes";
import { certificatesRouter } from "./modules/certificates/certificates.routes";
import { publicRouter } from "./modules/public/public.routes";
import { HttpError } from "./utils/httpError";

const localDevOrigins = [
  "http://localhost",
  "http://localhost:5173",
  "http://127.0.0.1",
  "http://127.0.0.1:5173",
];

function getAllowedOrigins() {
  return new Set(
    [env.CLIENT_ORIGIN, env.PUBLIC_APP_URL, ...localDevOrigins].filter(Boolean)
  );
}

function isAllowedCorsOrigin(origin: string | undefined) {
  return !origin || getAllowedOrigins().has(origin);
}

function getUniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target ?? "");

  if (target.includes("email")) {
    return "Пользователь с таким email уже существует";
  }

  if (target.includes("batchNumber")) {
    return "Партия с таким номером уже существует. Измените номер партии.";
  }

  if (target.includes("certificateNo")) {
    return "Сертификат с таким номером уже существует. Измените номер сертификата.";
  }

  if (target.includes("fileHash")) {
    return "Такой файл сертификата уже загружен. Загрузите другой файл.";
  }

  if (target.includes("txHash")) {
    return "Такая blockchain-транзакция уже записана. Повторите загрузку с другим номером сертификата.";
  }

  return "Запись с такими уникальными данными уже существует";
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, `CORS origin is not allowed: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "vermeat-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/batches", batchesRouter);
  app.use("/api", certificatesRouter);
  app.use("/api/public", publicRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: "Маршрут не найден" });
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      void _next;

      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Ошибка валидации",
          issues: error.issues,
        });
        return;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({ message: getUniqueConstraintMessage(error) });
        return;
      }

      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  );

  return app;
}
