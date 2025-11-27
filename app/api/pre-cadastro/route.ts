import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import PreRegistrationModel from '@/src/lib/models/preRegistration';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const email = body?.email?.trim()?.toLowerCase();
    const childName = body?.childName?.trim();
    const schoolId = body?.schoolId?.trim();
    const schoolName = body?.schoolName?.trim();

    if (!email || !childName || !schoolId || !schoolName) {
      return NextResponse.json({ error: 'Dados insuficientes.' }, { status: 400 });
    }

    await dbConnect();

    const record = await PreRegistrationModel.create({ email, childName, schoolId, schoolName });

    return NextResponse.json(
      {
        data: {
          id: record._id.toString(),
          email: record.email,
          childName: record.childName,
          schoolId: record.schoolId,
          schoolName: record.schoolName,
        },
        message: 'Pré-cadastro recebido com sucesso.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Pre-cadastro error', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar o pré-cadastro. Tente novamente.' },
      { status: 500 },
    );
  }
}
