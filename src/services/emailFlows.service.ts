import 'server-only';

import UserModel from '@/src/lib/models/user';
import { isSmtpConfigured, sendEmail } from '@/src/services/email.service';
import { createEmailToken, getAppBaseUrl } from '@/src/services/emailToken.service';
import { renderConfirmEmailChangeEmail, renderVerifyEmail } from '@/src/services/emailTemplates';

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
