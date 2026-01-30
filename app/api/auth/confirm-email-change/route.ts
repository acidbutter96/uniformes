import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { consumeEmailToken } from '@/src/services/emailToken.service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') ?? '';

    const consumed = await consumeEmailToken({ token, type: 'change_email' });

    await dbConnect();

    const user = await UserModel.findById(consumed.userId).exec();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const newEmail = String(consumed.email ?? '')
      .toLowerCase()
      .trim();
    if (!newEmail) {
      return NextResponse.json({ error: 'Token sem e-mail de destino.' }, { status: 400 });
    }

    const existing = await UserModel.findOne({ email: newEmail }).lean().exec();
    if (existing && existing._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 400 });
    }

    user.email = newEmail;
    user.verified = true;
    await user.save();

    return NextResponse.json({ data: { email: newEmail } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível confirmar alteração.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
