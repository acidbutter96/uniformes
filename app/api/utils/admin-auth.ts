import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/src/services/auth.service';

export type TokenPayload = {
  role?: string;
  sub?: string;
};

export function ensureAdminAccess(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = verifyAccessToken<TokenPayload>(token);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error('Admin auth verification failed', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
