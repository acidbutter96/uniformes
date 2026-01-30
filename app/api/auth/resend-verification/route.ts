import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { sendVerifyEmailForUser } from '@/src/services/emailFlows.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email }).exec();

    // Always return OK to avoid user enumeration
    if (!user || user.verified) {
      return NextResponse.json({ data: { emailSent: false } });
    }

    const result = await sendVerifyEmailForUser({
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reenviar e-mail.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
