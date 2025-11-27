import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/src/services/auth.service';
import { getById } from '@/src/services/user.service';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const payload = verifyAccessToken<{ sub?: string }>(token);

    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await getById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { password: removedPassword, ...safeUser } = user.toObject();
    void removedPassword;

    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Auth me error', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
