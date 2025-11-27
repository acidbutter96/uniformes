import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/src/services/auth.service';
import { getAll } from '@/src/services/user.service';

type TokenPayload = {
  sub?: string;
  role?: string;
};

function ensureAdminAccess(request: Request) {
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
    console.error('Admin users auth error', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function GET(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const users = await getAll();
    const data = users.map(rawUser => {
      const record = { ...(rawUser as unknown as Record<string, unknown>) };
      const rawId = record._id;
      delete record.password;
      delete record.__v;
      delete record._id;

      const id =
        typeof rawId === 'object' &&
        rawId !== null &&
        typeof (rawId as { toString?: () => string }).toString === 'function'
          ? (rawId as { toString: () => string }).toString()
          : ((rawId as string | number | undefined)?.toString() ?? '');

      return { id, ...record };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list users', error);
    return NextResponse.json({ error: 'Unable to fetch users.' }, { status: 500 });
  }
}
