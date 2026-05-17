import crypto from "node:crypto";
import { env } from "../config/env";

const OTP_DIGITS = 6;

export function generateOtpCode() {
  return crypto.randomInt(0, 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, "0");
}

export function hashOtpCode(userId: string, code: string) {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${userId}:${code}`)
    .digest("hex");
}

export function verifyOtpCode({
  userId,
  code,
  expectedHash,
}: {
  userId: string;
  code: string;
  expectedHash: string;
}) {
  const actualHash = hashOtpCode(userId, code);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
