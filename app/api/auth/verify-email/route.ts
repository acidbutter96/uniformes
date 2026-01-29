import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { consumeEmailToken } from '@/src/services/emailToken.service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') ?? '';

    const consumed = await consumeEmailToken({ token, type: 'verify_email' });

    await dbConnect();

    const user = await UserModel.findById(consumed.userId).exec();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Safety: only verify if token email matches the current user email
    const tokenEmail = String(consumed.email ?? '').toLowerCase();
    if (tokenEmail && tokenEmail !== String(user.email ?? '').toLowerCase()) {
      return NextResponse.json(
        { error: 'Token não corresponde ao e-mail atual do usuário.' },
        { status: 400 },
      );
    }

    if (!user.verified) {
      user.verified = true;
      await user.save();
    }

    return NextResponse.json({ data: { verified: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível confirmar e-mail.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
