import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16).default("dev-secret-change-me"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_TWO_FACTOR_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_TWO_FACTOR_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_PUBLIC_VERIFY_MAX: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_PUBLIC_VERIFY_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 1000),
    SERVER_PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
    PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:5173"),
    INTEGRATION_MODE: z.enum(["demo", "live"]).default("demo"),
    PINATA_JWT: z.string().optional(),
    PINATA_GATEWAY: z.string().optional(),
    POLYGON_AMOY_RPC_URL: z.string().optional(),
    POLYGON_PRIVATE_KEY: z.string().optional(),
    CERTIFICATE_CONTRACT_ADDRESS: z.string().optional(),
    TWO_FACTOR_EMAIL_PROVIDER: z.enum(["file", "resend", "smtp"]).default("file"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanString,
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (
      values.NODE_ENV === "production" &&
      values.INTEGRATION_MODE !== "live"
    ) {
      context.addIssue({
        code: "custom",
        path: ["INTEGRATION_MODE"],
        message: "INTEGRATION_MODE=live is required in production",
      });
    }

    if (values.INTEGRATION_MODE !== "live") {
      return;
    }

    const requiredLiveSettings = [
      "PINATA_JWT",
      "PINATA_GATEWAY",
      "POLYGON_AMOY_RPC_URL",
      "POLYGON_PRIVATE_KEY",
      "CERTIFICATE_CONTRACT_ADDRESS",
    ] as const;

    requiredLiveSettings.forEach((setting) => {
      if (!values[setting]?.trim()) {
        context.addIssue({
          code: "custom",
          path: [setting],
          message: `${setting} is required when INTEGRATION_MODE=live`,
        });
      }
    });
  });

export const env = envSchema.parse(process.env);
