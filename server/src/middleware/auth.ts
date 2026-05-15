import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload as JsonWebTokenPayload, SignOptions } from "jsonwebtoken";
import { UserRole } from "../../generated/prisma/enums";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
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

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function requireAuth(
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
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
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
