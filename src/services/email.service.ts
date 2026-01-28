import 'server-only';

import nodemailer from 'nodemailer';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !from) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM environment variables.',
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Invalid SMTP_PORT.');
  }

  const secure = String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true';

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const auth = user && pass ? { user, pass } : undefined;

  const tlsRejectUnauthorized = String(
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED ?? '',
  ).toLowerCase();

  const tls = tlsRejectUnauthorized === 'false' ? { rejectUnauthorized: false } : undefined;

  return { host, port, from, secure, auth, tls };
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;

  const config = getSmtpConfig();

  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: config.tls,
  });

  return cachedTransport;
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}

export async function sendEmail(input: SendEmailInput) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM as string;

  const info = await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });

  return { messageId: info.messageId };
}
