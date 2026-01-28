import { randomBytes } from 'crypto';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import SupplierInviteModel from '@/src/lib/models/supplierInvite';
import { isSmtpConfigured, sendEmail } from '@/src/services/email.service';
import { renderSupplierInviteEmail } from '@/src/services/emailTemplates';

export async function POST(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const payload = (await request.json().catch(() => null)) as {
      supplierId?: unknown;
      email?: unknown;
      expiresInMinutes?: unknown;
    } | null;

    const supplierId = payload?.supplierId;
    const email = payload?.email;
    const expiresInMinutes = Number(payload?.expiresInMinutes ?? 60);

    if (supplierId !== undefined && typeof supplierId !== 'string') {
      return badRequest('supplierId inválido.');
    }

    if (email !== undefined && typeof email !== 'string') {
      return badRequest('Email inválido.');
    }

    if (!Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0) {
      return badRequest('Duração do token inválida.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    await dbConnect();

    const token = randomBytes(24).toString('hex');

    const created = await SupplierInviteModel.create({
      token,
      supplierId: supplierId ?? null,
      email,
      role: 'supplier',
      expiresAt,
    });

    let emailSent = false;
    let emailError: string | undefined;

    if (email) {
      const baseUrl = (process.env.NEXT_APP_URL || process.env.NEXT_PUBLIC_URL || '').replace(
        /\/$/,
        '',
      );

      if (!baseUrl) {
        emailError = 'NEXT_APP_URL/NEXT_PUBLIC_URL não configurado para montar o link.';
      } else if (!isSmtpConfigured()) {
        emailError = 'SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_FROM).';
      } else {
        const link = `${baseUrl}/supplier-register?token=${created.token}`;
        try {
          const logoUrl = `${baseUrl}/images/logo.png`;
          const template = renderSupplierInviteEmail({
            inviteUrl: link,
            expiresInMinutes,
            logoUrl,
          });

          await sendEmail({
            to: email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });
          emailSent = true;
        } catch (err) {
          console.error('Failed to send supplier invite email', err);
          emailError = 'Falha ao enviar e-mail de convite.';
        }
      }
    }

    return ok({
      token: created.token,
      expiresAt: created.expiresAt.toISOString(),
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error('Failed to create supplier invite', error);
    return serverError('Não foi possível criar convite para fornecedor.');
  }
}
