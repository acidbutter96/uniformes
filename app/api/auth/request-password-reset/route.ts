import { NextResponse } from 'next/server';

import { requestPasswordReset } from '@/src/services/emailFlows.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    await requestPasswordReset({ email });

    // Avoid account enumeration
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    // Still avoid leaking; respond OK even if email couldn't be sent
    console.error('Request password reset error', error);
    return NextResponse.json({ data: { ok: true } });
  }
}
