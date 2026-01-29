import 'server-only';

const DEFAULT_THEME = {
  appName: 'UniformaDF',
  colors: {
    background: '#EEE9E5',
    surface: '#FFFFFF',
    border: '#D9D5D2',
    primary: '#496276',
    accent: '#FFB48A',
    text: '#1F232A',
    muted: '#5F6670',
    danger: '#DC2626',
    success: '#04D361',
  },
  radius: {
    card: '16px',
  },
  shadow: {
    card: '0 20px 45px -20px rgba(0, 28, 61, 0.35)',
  },
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export interface EmailCta {
  label: string;
  url: string;
}

export interface RenderEmailLayoutInput {
  title: string;
  preheader?: string;
  contentHtml: string;
  contentText?: string;
  cta?: EmailCta;
  footerText?: string;
  appName?: string;
  logoUrl?: string;
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderButtonHtml(cta: EmailCta) {
  const t = DEFAULT_THEME;
  const label = escapeHtml(cta.label);
  const url = escapeHtml(cta.url);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 0 0;">
      <tr>
        <td align="center" bgcolor="${t.colors.primary}" style="border-radius: 999px;">
          <a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 18px;font-weight:700;font-size:14px;letter-spacing:0.2px;text-decoration:none;color:#ffffff;font-family:${t.fontFamily};">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function renderEmailLayout(input: RenderEmailLayoutInput) {
  const t = DEFAULT_THEME;
  const appName = input.appName ?? t.appName;
  const title = escapeHtml(input.title);
  const preheader = input.preheader ? escapeHtml(input.preheader) : '';

  const footerText = input.footerText
    ? escapeHtml(input.footerText)
    : `Você recebeu este e-mail porque uma ação foi realizada no ${appName}.`;

  const logoHtml = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" width="120" alt="${escapeHtml(appName)}" style="display:block;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-size:18px;font-weight:800;letter-spacing:0.2px;color:${t.colors.primary};font-family:${t.fontFamily};">${escapeHtml(appName)}</div>`;

  const ctaHtml = input.cta ? renderButtonHtml(input.cta) : '';

  const html = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${t.colors.background};color:${t.colors.text};">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.colors.background};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
            <tr>
              <td style="padding:8px 8px 16px 8px;" align="left">
                ${logoHtml}
              </td>
            </tr>

            <tr>
              <td style="background:${t.colors.surface};border:1px solid ${t.colors.border};border-radius:${t.radius.card};box-shadow:${t.shadow.card};padding:22px;" align="left">
                <div style="font-family:${t.fontFamily};font-size:22px;line-height:28px;font-weight:800;margin:0 0 12px 0;color:${t.colors.text};">
                  ${title}
                </div>

                <div style="font-family:${t.fontFamily};font-size:16px;line-height:24px;font-weight:400;margin:0;color:${t.colors.text};">
                  ${input.contentHtml}
                </div>

                ${ctaHtml}

                <div style="font-family:${t.fontFamily};font-size:12px;line-height:18px;margin-top:18px;color:${t.colors.muted};">
                  Se o botão não funcionar, copie e cole o link no navegador.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 8px 0 8px;" align="left">
                <div style="font-family:${t.fontFamily};font-size:12px;line-height:18px;color:${t.colors.muted};">
                  ${footerText}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text =
    input.contentText ?? `${input.title}\n\n${preheader ? preheader + '\n\n' : ''}`.trim();

  return { html, text };
}

export interface RenderSupplierInviteEmailInput {
  inviteUrl: string;
  expiresInMinutes: number;
  appName?: string;
  logoUrl?: string;
}

export interface RenderVerifyEmailInput {
  verifyUrl: string;
  appName?: string;
  logoUrl?: string;
}

export function renderVerifyEmail(input: RenderVerifyEmailInput) {
  const appName = input.appName ?? DEFAULT_THEME.appName;
  const title = 'Confirme seu e-mail';
  const preheader = 'Confirme seu e-mail para ativar sua conta.';

  const safeUrl = escapeHtml(input.verifyUrl);

  const contentHtml = [
    `<p style="margin:0 0 12px 0;">Para ativar sua conta no <strong>${escapeHtml(appName)}</strong>, confirme seu e-mail clicando no botão abaixo.</p>`,
    `<p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:${DEFAULT_THEME.colors.muted};">Link direto: <a href="${safeUrl}" target="_blank" rel="noopener" style="color:${DEFAULT_THEME.colors.primary};text-decoration:underline;">${safeUrl}</a></p>`,
  ].join('');

  const contentText = `Para ativar sua conta no ${appName}, confirme seu e-mail:\n\n${input.verifyUrl}`;

  const { html, text } = renderEmailLayout({
    title,
    preheader,
    contentHtml,
    contentText,
    cta: { label: 'Confirmar e-mail', url: input.verifyUrl },
    appName,
    logoUrl: input.logoUrl,
  });

  return { subject: title, html, text };
}

export interface RenderConfirmEmailChangeInput {
  confirmUrl: string;
  newEmail: string;
  appName?: string;
  logoUrl?: string;
}

export function renderConfirmEmailChangeEmail(input: RenderConfirmEmailChangeInput) {
  const appName = input.appName ?? DEFAULT_THEME.appName;
  const title = 'Confirme a alteração de e-mail';
  const preheader = 'Confirme seu novo e-mail para concluir a alteração.';
  const safeUrl = escapeHtml(input.confirmUrl);

  const contentHtml = [
    `<p style="margin:0 0 12px 0;">Recebemos uma solicitação para alterar o e-mail da sua conta no <strong>${escapeHtml(
      appName,
    )}</strong> para <strong>${escapeHtml(input.newEmail)}</strong>.</p>`,
    `<p style="margin:0 0 12px 0;">Para confirmar, clique no botão abaixo:</p>`,
    `<p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:${DEFAULT_THEME.colors.muted};">Link direto: <a href="${safeUrl}" target="_blank" rel="noopener" style="color:${DEFAULT_THEME.colors.primary};text-decoration:underline;">${safeUrl}</a></p>`,
    `<p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:${DEFAULT_THEME.colors.muted};">Se você não solicitou esta alteração, ignore este e-mail.</p>`,
  ].join('');

  const contentText =
    `Confirme a alteração de e-mail no ${appName}.\n\n` +
    `Novo e-mail: ${input.newEmail}\n\n` +
    `Confirmar: ${input.confirmUrl}`;

  const { html, text } = renderEmailLayout({
    title,
    preheader,
    contentHtml,
    contentText,
    cta: { label: 'Confirmar alteração', url: input.confirmUrl },
    appName,
    logoUrl: input.logoUrl,
  });

  return { subject: title, html, text };
}

export function renderSupplierInviteEmail(input: RenderSupplierInviteEmailInput) {
  const appName = input.appName ?? DEFAULT_THEME.appName;
  const title = 'Convite para cadastro de fornecedor';
  const preheader = `Use este link para concluir o cadastro. Válido por ${input.expiresInMinutes} minuto(s).`;

  const safeUrl = escapeHtml(input.inviteUrl);

  const contentHtml = [
    `<p style="margin:0 0 12px 0;">Você recebeu um convite para cadastrar um fornecedor no <strong>${escapeHtml(
      appName,
    )}</strong>.</p>`,
    `<p style="margin:0 0 12px 0;">Clique no botão abaixo para continuar:</p>`,
    `<p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:${DEFAULT_THEME.colors.muted};">Link direto: <a href="${safeUrl}" target="_blank" rel="noopener" style="color:${DEFAULT_THEME.colors.primary};text-decoration:underline;">${safeUrl}</a></p>`,
    `<p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:${DEFAULT_THEME.colors.muted};">Este convite expira em <strong>${escapeHtml(
      String(input.expiresInMinutes),
    )}</strong> minuto(s).</p>`,
  ].join('');

  const contentText =
    `Você recebeu um convite para cadastrar um fornecedor no ${appName}.\n\n` +
    `Acesse: ${input.inviteUrl}\n\n` +
    `Este convite expira em ${input.expiresInMinutes} minuto(s).`;

  const { html, text } = renderEmailLayout({
    title,
    preheader,
    contentHtml,
    contentText,
    cta: { label: 'Concluir cadastro', url: input.inviteUrl },
    appName,
    logoUrl: input.logoUrl,
  });

  return { subject: title, html, text };
}
