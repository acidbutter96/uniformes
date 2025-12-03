import { NextResponse } from 'next/server';

import { registerUser } from '@/src/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { name, email, password, cpf, birthDate, address, childrenCount, role } = body ?? {};

    const missingFields: string[] = [];
    if (!name) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('senha');
    if (!cpf) missingFields.push('cpf');
    if (!birthDate) missingFields.push('data de nascimento');
    if (!address) missingFields.push('endereço');

    if ((role ?? 'user') === 'user') {
      if (childrenCount === undefined || childrenCount === null) {
        missingFields.push('quantidade de filhos');
      } else {
        const numeric = Number(childrenCount);
        if (!Number.isFinite(numeric) || numeric < 0 || !Number.isInteger(numeric)) {
          return NextResponse.json({ error: 'Quantidade de filhos inválida.' }, { status: 400 });
        }
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campos obrigatórios faltando: ${missingFields.join(', ')}.` },
        { status: 400 },
      );
    }

    const { user, token } = await registerUser({
      name,
      email,
      password,
      cpf,
      birthDate,
      address,
      childrenCount,
      role,
    });

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Register error', error);
    const message = error instanceof Error ? error.message : 'Unable to register user.';
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
