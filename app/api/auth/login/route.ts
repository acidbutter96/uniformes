import { NextResponse } from 'next/server';

import { loginWithCredentials } from '@/src/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    const { user, token } = await loginWithCredentials(email, password);

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }
}
