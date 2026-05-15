import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { AuditAction, UserRole } from "../../../generated/prisma/enums";
import { prisma } from "../../db/prisma";
import { requireAuth, signAccessToken } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";

const registerSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  inn: z.string().min(10).max(12).optional(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const email = payload.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new HttpError(
        409,
        "Пользователь с таким email уже существует"
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        companyName: payload.companyName,
        email,
        phone: payload.phone,
        inn: payload.inn,
        passwordHash,
        role: UserRole.SUPPLIER,
        auditLogs: {
          create: {
            action: AuditAction.USER_REGISTERED,
            entity: "User",
            message: "Поставщик зарегистрирован",
          },
        },
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({ user, token });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    const isValidPassword = await bcrypt.compare(
      payload.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    await prisma.auditLog.create({
      data: {
        action: AuditAction.USER_LOGIN,
        entity: "User",
        entityId: user.id,
        message: "Пользователь вошел в систему",
        userId: user.id,
      },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = req.user;

    if (!currentUser) {
      throw new HttpError(401, "Требуется авторизация");
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        inn: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new HttpError(404, "Пользователь не найден");
    }

    res.json({ user });
  })
);
