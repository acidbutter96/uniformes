import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { hashPassword } from '@/src/services/auth.service';
import { consumeEmailToken } from '@/src/services/emailToken.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
      newPassword?: unknown;
    } | null;

    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório.' }, { status: 400 });
    }

    if (!newPassword || newPassword.trim().length < 8) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 8 caracteres.' },
        { status: 400 },
      );
    }

    const consumed = await consumeEmailToken({ token, type: 'reset_password' });

    await dbConnect();

    const user = await UserModel.findById(consumed.userId).exec();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const tokenEmail = String(consumed.email ?? '')
      .trim()
      .toLowerCase();
    const currentEmail = String(user.email ?? '')
      .trim()
      .toLowerCase();
    if (!tokenEmail || tokenEmail !== currentEmail) {
      return NextResponse.json(
        { error: 'Token não corresponde ao e-mail atual da conta.' },
        { status: 400 },
      );
    }

    user.password = await hashPassword(newPassword.trim());
    user.verified = true;
    await user.save();

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível redefinir senha.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
