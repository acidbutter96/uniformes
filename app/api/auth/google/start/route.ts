import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE_NAME = 'google_oauth_state';
const DEFAULT_SCOPE = 'openid email profile';
const STATE_MAX_AGE_SECONDS = 600;

const isProduction = process.env.NODE_ENV === 'production';

function resolveRedirectUri(): string {
  const appBaseUrl = process.env.NEXT_PUBLIC_URL;
  if (!appBaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_URL environment variable.');
  }

  const normalizedBase = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
  return `${normalizedBase}/api/auth/google/callback`;
}

function sanitizeReturnTo(path?: string | null): string | null {
  if (!path || typeof path !== 'string') {
    return null;
  }

  if (!path.startsWith('/')) {
    return null;
  }

  try {
    const normalized = new URL(path, 'https://example.com');
    return normalized.pathname + normalized.search + normalized.hash;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = resolveRedirectUri();
  const scope = process.env.GOOGLE_OAUTH_SCOPE ?? DEFAULT_SCOPE;

  if (!clientId) {
    console.error('Missing Google OAuth client id (GOOGLE_CLIENT_ID).');
    return NextResponse.json({ error: 'Google OAuth is not configured.' }, { status: 500 });
  }

  const state = randomBytes(24).toString('hex');
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'));

  const payload = {
    state,
    returnTo: returnTo ?? null,
    issuedAt: Date.now(),
  } satisfies { state: string; returnTo: string | null; issuedAt: number };

  const encodedState = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
  const googleAuthUrl = new URL(GOOGLE_AUTH_URL);
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', scope);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('include_granted_scopes', 'true');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  googleAuthUrl.searchParams.set('state', state);
  const response = NextResponse.redirect(googleAuthUrl);
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: encodedState,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return response;
}
