import 'server-only';

import nodemailer from 'nodemailer';

import { logEmailEvent } from '@/src/services/emailLog.service';

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
  const from = process.env.SMTP_FROM as string;

  try {
    const config = getSmtpConfig();
    const transport = getTransport();

    const info = await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });

    await logEmailEvent({
      status: 'sent',
      from,
      to: input.to,
      subject: input.subject,
      replyTo: input.replyTo,
      messageId: info.messageId,
      smtp: { host: config.host, port: config.port, secure: config.secure },
      content: { html: input.html, text: input.text },
    });

    return { messageId: info.messageId };
  } catch (error) {
    await logEmailEvent({
      status: 'failed',
      from,
      to: input.to,
      subject: input.subject,
      replyTo: input.replyTo,
      smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? NaN),
        secure: String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
      },
      content: { html: input.html, text: input.text },
      error,
    });

    throw error;
  }
}
