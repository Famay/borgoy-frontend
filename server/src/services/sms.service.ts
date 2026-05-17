import fs from "node:fs/promises";
import path from "node:path";

interface SendTwoFactorSmsInput {
  phone: string;
  code: string;
  userEmail: string;
}

const outboxFilePath = path.join(
  process.cwd(),
  "server",
  "sms-outbox",
  "2fa-codes.txt"
);

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length <= 4) {
    return "****";
  }

  return `***${digits.slice(-4)}`;
}

export async function sendTwoFactorSms({
  phone,
  code,
  userEmail,
}: SendTwoFactorSmsInput) {
  await fs.mkdir(path.dirname(outboxFilePath), { recursive: true });
  await fs.appendFile(
    outboxFilePath,
    [
      `[${new Date().toISOString()}]`,
      `phone=${phone}`,
      `user=${userEmail}`,
      `code=${code}`,
      "",
    ].join(" ") + "\n",
    "utf8"
  );
}
