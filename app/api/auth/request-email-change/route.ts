import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { verifyAccessToken } from '@/src/services/auth.service';
import { requestEmailChange } from '@/src/services/emailFlows.service';

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

    const body = (await request.json().catch(() => null)) as { newEmail?: unknown } | null;
    const newEmail = typeof body?.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';

    if (!newEmail) {
      return NextResponse.json({ error: 'Novo e-mail é obrigatório.' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findById(payload.sub).exec();
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const currentEmail = String(user.email ?? '').toLowerCase();
    if (currentEmail === newEmail) {
      return NextResponse.json({ data: { emailSent: false } });
    }

    const existing = await UserModel.findOne({ email: newEmail }).lean().exec();
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 400 });
    }

    const result = await requestEmailChange({
      userId: user._id.toString(),
      newEmail,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível solicitar alteração.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
