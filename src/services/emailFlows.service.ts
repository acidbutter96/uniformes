import 'server-only';

import dbConnect from '@/src/lib/database';
import EmailTokenModel from '@/src/lib/models/emailToken';
import UserModel from '@/src/lib/models/user';
import { isSmtpConfigured, sendEmail } from '@/src/services/email.service';
import { logEmailEvent } from '@/src/services/emailLog.service';
import { createEmailToken, getAppBaseUrl } from '@/src/services/emailToken.service';
import {
  renderConfirmEmailChangeEmail,
  renderPasswordResetEmail,
  renderVerifyEmail,
} from '@/src/services/emailTemplates';

function getLogoUrl(baseUrl: string) {
  if (!baseUrl) return undefined;
  return `${baseUrl}/images/logo.png`;
}

export async function sendVerifyEmailForUser(params: { userId: string; email: string }) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return { emailSent: false, emailError: 'NEXT_APP_URL/NEXT_PUBLIC_URL não configurado.' };
  }
  if (!isSmtpConfigured()) {
    return {
      emailSent: false,
      emailError: 'SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_FROM).',
    };
  }

  const { rawToken } = await createEmailToken({
    userId: params.userId,
    email: params.email,
    type: 'verify_email',
  });

  const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
  const template = renderVerifyEmail({
    verifyUrl,
    logoUrl: getLogoUrl(baseUrl),
  });

  await sendEmail({
    to: params.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { emailSent: true };
}

export async function requestEmailChange(params: { userId: string; newEmail: string }) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return { emailSent: false, emailError: 'NEXT_APP_URL/NEXT_PUBLIC_URL não configurado.' };
  }
  if (!isSmtpConfigured()) {
    return {
      emailSent: false,
      emailError: 'SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_FROM).',
    };
  }

  const { rawToken } = await createEmailToken({
    userId: params.userId,
    email: params.newEmail,
    type: 'change_email',
  });

  const confirmUrl = `${baseUrl}/confirm-email-change?token=${rawToken}`;
  const template = renderConfirmEmailChangeEmail({
    confirmUrl,
    newEmail: params.newEmail,
    logoUrl: getLogoUrl(baseUrl),
  });

  await sendEmail({
    to: params.newEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  // Optional: notify old email that a change was requested (best-effort)
  try {
    const user = await UserModel.findById(params.userId).select({ email: 1 }).lean().exec();
    const oldEmail = user?.email;
    if (oldEmail && oldEmail !== params.newEmail) {
      await sendEmail({
        to: oldEmail,
        subject: 'Solicitação de alteração de e-mail',
        text: 'Foi solicitada uma alteração de e-mail para sua conta. Se você não reconhece essa ação, entre em contato com o suporte.',
      });
    }
  } catch {
    // ignore
  }

  return { emailSent: true };
}

export async function requestPasswordReset(params: { email: string }) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return { emailSent: false, emailError: 'NEXT_APP_URL/NEXT_PUBLIC_URL não configurado.' };
  }
  if (!isSmtpConfigured()) {
    return {
      emailSent: false,
      emailError: 'SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_FROM).',
    };
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { emailSent: false, emailError: 'E-mail é obrigatório.' };
  }

  await dbConnect();

  const user = await UserModel.findOne({ email: normalizedEmail })
    .select({ _id: 1, email: 1 })
    .exec();
  if (!user) {
    // Avoid leaking whether user exists
    return { emailSent: true };
  }

  const cooldownMs = 2 * 60 * 1000;
  const cooldownAfter = new Date(Date.now() - cooldownMs);
  const recentReset = await EmailTokenModel.findOne({
    email: normalizedEmail,
    type: 'reset_password',
    createdAt: { $gt: cooldownAfter },
  })
    .select({ _id: 1 })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (recentReset) {
    // Cooldown: do not send another email yet.
    await logEmailEvent({
      status: 'skipped',
      from: process.env.SMTP_FROM,
      to: normalizedEmail,
      subject: 'Recuperação de senha',
      smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? NaN),
        secure: String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
      },
      reason: 'password_reset_cooldown_2min',
    });
    return { emailSent: true };
  }

  const { rawToken } = await createEmailToken({
    userId: user._id.toString(),
    email: normalizedEmail,
    type: 'reset_password',
  });

  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
  const template = renderPasswordResetEmail({
    resetUrl,
    logoUrl: getLogoUrl(baseUrl),
  });

  await sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { emailSent: true };
}
