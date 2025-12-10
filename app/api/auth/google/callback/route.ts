import { Buffer } from 'node:buffer';

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { loginWithGoogle } from '@/src/services/auth.service';

const STATE_COOKIE_NAME = 'google_oauth_state';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
const DEFAULT_RETURN_PATH = '/sugestao';
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const isProduction = process.env.NODE_ENV === 'production';

function resolveRedirectUri(): string {
  const appBaseUrl = process.env.NEXT_PUBLIC_URL;
  if (!appBaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_URL environment variable.');
  }

  const normalizedBase = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
  return `${normalizedBase}/api/auth/google/callback`;
}

interface GoogleStatePayload {
  state: string;
  returnTo?: string;
  issuedAt: number;
}

function sanitizeReturnPath(path?: string | null): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return null;
  }

  try {
    const normalized = new URL(path, 'https://example.com');
    return normalized.pathname + normalized.search + normalized.hash;
  } catch {
    return null;
  }
}

function decodeStateCookie(value?: string | null): GoogleStatePayload | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, 'base64').toString('utf-8');
    return JSON.parse(json) as GoogleStatePayload;
  } catch (error) {
    console.error('Failed to decode Google state', error);
    return null;
  }
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  });
  return response;
}

function buildLoginRedirect(request: NextRequest, code: string, fallbackReturn?: string | null) {
  const params = new URLSearchParams({ error: code });
  if (fallbackReturn && fallbackReturn.startsWith('/')) {
    params.set('returnTo', fallbackReturn);
  }
  const target = new URL(`/login?${params.toString()}`, request.nextUrl.origin);
  return clearStateCookie(NextResponse.redirect(target));
}

function buildSuccessHtml(token: string, redirectTo: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Concluindo login…</title>
  </head>
  <body>
    <p>Concluindo login com Google…</p>
    <script>
      (function completeGoogleLogin() {
        try {
          var token = ${JSON.stringify(token)};
          if (token) {
            window.localStorage.setItem('accessToken', token);
          }
          window.localStorage.removeItem('refreshToken');

          // Sempre que logar, resetar o fluxo de reservas para a primeira tela
          try {
            window.sessionStorage.removeItem('uniformes:order-flow');
          } catch (e) {
            console.error('Falha ao limpar fluxo de reservas', e);
          }
        } catch (error) {
          console.error('Falha ao armazenar token do Google OAuth', error);
        }
        // Independente do returnTo anterior, após login Google começamos em /alunos
        var target = ${JSON.stringify('/alunos')};
        window.location.replace(target);
      })();
    </script>
    <noscript>
      Habilite JavaScript para concluir o login. Caso contrário, copie e cole este link no seu
      navegador: ${redirectTo}
    </noscript>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = resolveRedirectUri();

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth vars (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).');
    return NextResponse.json({ error: 'Google OAuth is not configured.' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const encodedState = cookieStore.get(STATE_COOKIE_NAME)?.value ?? null;

  const statePayload = decodeStateCookie(encodedState);
  const storedReturnTo = sanitizeReturnPath(statePayload?.returnTo);

  const googleError = request.nextUrl.searchParams.get('error');
  if (googleError) {
    const code = googleError === 'access_denied' ? 'google_access_denied' : 'google_oauth_error';
    return buildLoginRedirect(request, code, storedReturnTo);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return buildLoginRedirect(request, 'google_missing_code', storedReturnTo);
  }

  if (!statePayload || statePayload.state !== state) {
    return buildLoginRedirect(request, 'google_state_mismatch', storedReturnTo);
  }

  if (Date.now() - statePayload.issuedAt > STATE_MAX_AGE_MS) {
    return buildLoginRedirect(request, 'google_state_expired', storedReturnTo);
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed', await tokenResponse.text());
      return buildLoginRedirect(request, 'google_exchange_failed', storedReturnTo);
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      id_token?: string;
    };

    if (!tokenPayload.access_token) {
      return buildLoginRedirect(request, 'google_missing_access_token', storedReturnTo);
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
      cache: 'no-store',
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch Google profile', await profileResponse.text());
      return buildLoginRedirect(request, 'google_profile_failed', storedReturnTo);
    }

    const profile = (await profileResponse.json()) as {
      email?: string;
      name?: string;
      sub?: string;
    };

    const { user, token } = await loginWithGoogle(profile);

    const roleBasedReturn = user?.role === 'admin' ? '/admin/dashboard' : DEFAULT_RETURN_PATH;
    const redirectPath = storedReturnTo || roleBasedReturn;
    const redirectUrl = new URL(redirectPath, request.nextUrl.origin).toString();

    return clearStateCookie(
      new NextResponse(buildSuccessHtml(token, redirectUrl), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }),
    );
  } catch (error) {
    console.error('Google OAuth callback error', error);
    return buildLoginRedirect(request, 'google_unexpected_error', storedReturnTo);
  }
}
