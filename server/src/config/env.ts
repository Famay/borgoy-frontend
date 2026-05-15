import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).default("dev-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:5173"),
  PINATA_JWT: z.string().optional(),
  PINATA_GATEWAY: z.string().optional(),
  POLYGON_AMOY_RPC_URL: z.string().optional(),
  POLYGON_PRIVATE_KEY: z.string().optional(),
  CERTIFICATE_CONTRACT_ADDRESS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
