import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { AuditAction, UserRole, UserStatus } from "../../../generated/prisma/enums";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import {
  requireAuth,
  signAccessToken,
  signTwoFactorChallengeToken,
  verifyTwoFactorChallengeToken,
} from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { maskEmail, sendTwoFactorEmail } from "../../services/email.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "../../utils/otp";

const TWO_FACTOR_CODE_TTL_MS = 5 * 60 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const loginRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_LOGIN_MAX,
  message: "Слишком много попыток входа. Повторите попытку позже.",
});
const twoFactorRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_TWO_FACTOR_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_TWO_FACTOR_MAX,
  message: "Слишком много попыток подтверждения 2FA. Повторите попытку позже.",
});

const registerSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .min(6)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  inn: z.string().min(10).max(12).optional(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(20),
  code: z.string().trim().regex(/^\d{6}$/),
});

interface AuthUserShape {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  twoFactorEnabled: boolean;
}

interface TwoFactorUser {
  id: string;
  email: string;
  twoFactorCodeHash: string | null;
  twoFactorCodeExpiresAt: Date | null;
  twoFactorCodeAttempts: number;
}

export const authRouter = Router();

function mapAuthUser(user: AuthUserShape) {
  return {
    id: user.id,
    name: user.name,
    companyName: user.companyName,
    email: user.email,
    role: user.role,
    status: user.status,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

function assertUserCanLogin(user: { status: UserStatus }) {
  if (user.status === UserStatus.BLOCKED) {
    throw new HttpError(403, "Учетная запись заблокирована");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, "Учетная запись ожидает подтверждения");
  }
}

function shouldRequireTwoFactor(user: {
  role: UserRole;
  twoFactorEnabled: boolean;
}) {
  return user.role === UserRole.SUPPLIER && user.twoFactorEnabled;
}

async function writeLoginAudit(userId: string, twoFactorUsed: boolean) {
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_LOGIN,
      entity: "User",
      entityId: userId,
      message: "Пользователь вошел в систему",
      userId,
      metadata: {
        twoFactorUsed,
      },
    },
  });
}

async function issueTwoFactorCode(user: {
  id: string;
  email: string;
}) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCodeHash: hashOtpCode(user.id, code),
      twoFactorCodeExpiresAt: expiresAt,
      twoFactorCodeAttempts: 0,
      twoFactorCodeSentAt: new Date(),
    },
  });

  try {
    await sendTwoFactorEmail({
      email: user.email,
      code,
    });
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "Не удалось отправить код подтверждения на email");
  }

  return {
    challengeToken: signTwoFactorChallengeToken(user.id),
    emailMasked: maskEmail(user.email),
  };
}

async function rejectTwoFactorLogin(user: TwoFactorUser, message: string) {
  const nextAttempts = user.twoFactorCodeAttempts + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCodeAttempts: nextAttempts,
      ...(nextAttempts >= TWO_FACTOR_MAX_ATTEMPTS
        ? {
            twoFactorCodeHash: null,
            twoFactorCodeExpiresAt: null,
            twoFactorCodeSentAt: null,
          }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_LOGIN_2FA_FAILED,
      entity: "User",
      entityId: user.id,
      message,
      userId: user.id,
    },
  });

  throw new HttpError(401, message);
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const email = payload.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new HttpError(409, "Пользователь с таким email уже существует");
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
        twoFactorEnabled: true,
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
        twoFactorEnabled: true,
      },
    });

    res.status(201).json({ user: mapAuthUser(user) });
  })
);

authRouter.post(
  "/login",
  loginRateLimiter,
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

    assertUserCanLogin(user);

    if (shouldRequireTwoFactor(user)) {
      const challenge = await issueTwoFactorCode(user);

      res.json({
        twoFactorRequired: true,
        challengeToken: challenge.challengeToken,
        emailMasked: challenge.emailMasked,
      });
      return;
    }

    await writeLoginAudit(user.id, false);

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({
      user: mapAuthUser(user),
      token,
    });
  })
);

authRouter.post(
  "/login/2fa",
  twoFactorRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = twoFactorLoginSchema.parse(req.body);
    const challenge = verifyTwoFactorChallengeToken(payload.challengeToken);
    const user = await prisma.user.findUnique({ where: { id: challenge.sub } });

    if (!user || !user.twoFactorEnabled) {
      throw new HttpError(401, "Недействительный код подтверждения");
    }

    assertUserCanLogin(user);

    if (!user.twoFactorCodeHash || !user.twoFactorCodeExpiresAt) {
      throw new HttpError(401, "Код подтверждения не найден. Войдите заново.");
    }

    if (user.twoFactorCodeExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCodeHash: null,
          twoFactorCodeExpiresAt: null,
          twoFactorCodeAttempts: 0,
          twoFactorCodeSentAt: null,
        },
      });

      throw new HttpError(401, "Код подтверждения истек. Войдите заново.");
    }

    if (user.twoFactorCodeAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      throw new HttpError(401, "Превышено число попыток. Войдите заново.");
    }

    if (
      !verifyOtpCode({
        userId: user.id,
        code: payload.code,
        expectedHash: user.twoFactorCodeHash,
      })
    ) {
      await rejectTwoFactorLogin(user, "Неверный код подтверждения");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
        twoFactorCodeAttempts: 0,
        twoFactorCodeSentAt: null,
      },
    });
    await writeLoginAudit(user.id, true);

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({
      user: mapAuthUser(user),
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
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new HttpError(404, "Пользователь не найден");
    }

    res.json({ user: mapAuthUser(user) });
  })
);
