import { NextResponse } from 'next/server';

import { registerUser } from '@/src/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { name, email, password } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const { user, token } = await registerUser({ name, email, password });

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Register error', error);
    return NextResponse.json({ error: 'Unable to register user.' }, { status: 500 });
  }
}
