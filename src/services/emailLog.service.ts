import 'server-only';

import dbConnect from '@/src/lib/database';
import EmailLogModel, { type EmailLogStatus } from '@/src/lib/models/emailLog';

type ErrorLike = {
  name?: string;
  message?: string;
  stack?: string;
  code?: unknown;
  response?: unknown;
  responseCode?: unknown;
  command?: unknown;
};

function toStringArray(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

export async function logEmailEvent(input: {
  status: EmailLogStatus;
  from?: string;
  to?: string | string[];
  subject?: string;
  replyTo?: string;
  messageId?: string;
  smtp?: { host?: string; port?: number; secure?: boolean };
  content?: { html?: string; text?: string };
  reason?: string;
  error?: unknown;
}) {
  try {
    await dbConnect();

    const error = input.error as ErrorLike | undefined;
    const html = input.content?.html;
    const text = input.content?.text;

    await EmailLogModel.create({
      provider: 'smtp',
      status: input.status,
      from: input.from,
      to: toStringArray(input.to),
      subject: input.subject,
      replyTo: input.replyTo,
      messageId: input.messageId,
      smtp: input.smtp,
      content: {
        hasHtml: Boolean(html),
        hasText: Boolean(text),
        htmlLength: typeof html === 'string' ? html.length : 0,
        textLength: typeof text === 'string' ? text.length : 0,
      },
      reason: input.reason,
      error: input.error
        ? {
            name: safeString(error?.name),
            message: safeString(error?.message) ?? safeString(input.error),
            stack: safeString(error?.stack),
            code: (error as { code?: unknown } | undefined)?.code,
            response: safeString(error?.response),
            responseCode: typeof error?.responseCode === 'number' ? error.responseCode : undefined,
            command: safeString(error?.command),
          }
        : undefined,
    });
  } catch {
    // Never block user flows on logging
  }
}
