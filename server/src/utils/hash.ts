import { createHash, randomBytes } from "node:crypto";

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function createPublicToken(prefix: string) {
  return `${prefix}-${randomBytes(8).toString("hex")}`.toLowerCase();
}

export function createDemoIpfsCid(hash: string) {
  return `bafy${hash.slice(0, 43).toLowerCase()}`;
}

export function createDemoTransactionHash(hash: string) {
  return `0x${createHash("sha256").update(hash).digest("hex")}`;
}
