import fs from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

interface SendTwoFactorEmailInput {
  email: string;
  code: string;
}

const outboxFilePath = path.join(
  process.cwd(),
  "server",
  "email-outbox",
  "2fa-codes.txt"
);

let smtpTransporter: Transporter | null = null;

export function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");

  if (!domain) {
    return "***";
  }

  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
  const hiddenPart = "*".repeat(Math.max(localPart.length - visiblePrefix.length, 3));

  return `${visiblePrefix}${hiddenPart}@${domain}`;
}

async function writeTwoFactorEmailToFile({ email, code }: SendTwoFactorEmailInput) {
  await fs.mkdir(path.dirname(outboxFilePath), { recursive: true });
  await fs.appendFile(
    outboxFilePath,
    [
      `[${new Date().toISOString()}]`,
      `email=${email}`,
      `code=${code}`,
      "",
    ].join(" ") + "\n",
    "utf8"
  );
}

async function sendTwoFactorEmailWithResend({
  email,
  code,
}: SendTwoFactorEmailInput) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Отправка email-кодов не настроена");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Код входа VerMeat",
      text: `Ваш код входа VerMeat: ${code}. Код действует 5 минут.`,
      html: `<p>Ваш код входа VerMeat:</p><p><strong>${code}</strong></p><p>Код действует 5 минут.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Не удалось отправить email-код");
  }
}

function getSmtpTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error("SMTP-отправка email-кодов не настроена");
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  return smtpTransporter;
}

async function sendTwoFactorEmailWithSmtp({
  email,
  code,
}: SendTwoFactorEmailInput) {
  if (!env.EMAIL_FROM) {
    throw new Error("Отправитель email-кодов не настроен");
  }

  await getSmtpTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Код входа VerMeat",
    text: `Ваш код входа VerMeat: ${code}. Код действует 5 минут.`,
    html: `<p>Ваш код входа VerMeat:</p><p><strong>${code}</strong></p><p>Код действует 5 минут.</p>`,
  });
}

export async function sendTwoFactorEmail(input: SendTwoFactorEmailInput) {
  if (env.TWO_FACTOR_EMAIL_PROVIDER === "resend") {
    await sendTwoFactorEmailWithResend(input);
    return;
  }

  if (env.TWO_FACTOR_EMAIL_PROVIDER === "smtp") {
    await sendTwoFactorEmailWithSmtp(input);
    return;
  }

  await writeTwoFactorEmailToFile(input);
}
