import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload as JsonWebTokenPayload, SignOptions } from "jsonwebtoken";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { HttpError } from "../utils/httpError";

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

interface TwoFactorChallengePayload {
  sub: string;
  purpose: "two-factor-login";
}

function isUserRole(role: unknown): role is UserRole {
  return role === UserRole.ADMIN || role === UserRole.SUPPLIER;
}

function parseAccessTokenPayload(
  payload: string | JsonWebTokenPayload
): AccessTokenPayload {
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    !isUserRole(payload.role)
  ) {
    throw new HttpError(401, "Недействительный токен");
  }

  return {
    sub: payload.sub,
    role: payload.role,
    email: payload.email,
  };
}

function parseTwoFactorChallengePayload(
  payload: string | JsonWebTokenPayload
): TwoFactorChallengePayload {
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    payload.purpose !== "two-factor-login"
  ) {
    throw new HttpError(401, "Недействительный код подтверждения");
  }

  return {
    sub: payload.sub,
    purpose: "two-factor-login",
  };
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function signTwoFactorChallengeToken(userId: string) {
  return jwt.sign(
    {
      sub: userId,
      purpose: "two-factor-login",
    },
    env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}

export function verifyTwoFactorChallengeToken(token: string) {
  return parseTwoFactorChallengePayload(jwt.verify(token, env.JWT_SECRET));
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    next(new HttpError(401, "Требуется авторизация"));
    return;
  }

  try {
    const payload = parseAccessTokenPayload(jwt.verify(token, env.JWT_SECRET));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      next(new HttpError(401, "Недействительный токен"));
      return;
    }

    if (user.status === UserStatus.BLOCKED) {
      next(new HttpError(403, "Учетная запись заблокирована"));
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      next(new HttpError(403, "Учетная запись ожидает подтверждения"));
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };
    next();
  } catch {
    next(new HttpError(401, "Недействительный токен"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "Требуется авторизация"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Недостаточно прав"));
      return;
    }

    next();
  };
}
