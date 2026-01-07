import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/src/services/auth.service';
import { findByCpf } from '@/src/services/user.service';

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const raw = typeof body?.cpf === 'string' ? body.cpf : '';
    const sanitized = raw.replace(/\D/g, '');
    if (sanitized.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 });
    }

    const found = await findByCpf(sanitized);
    // consider duplicate only if found and it's not the current user
    const exists = !!(found && String(found._id) !== String(payload.sub));
    return NextResponse.json({ data: { exists } });
  } catch (err) {
    console.error('check-cpf error', err);
    return NextResponse.json({ error: 'Bad Request.' }, { status: 400 });
  }
}
