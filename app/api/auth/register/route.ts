import { NextResponse } from 'next/server';

import { registerUser } from '@/src/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { name, email, password, cpf, birthDate, address, children, role } = body ?? {};

    const missingFields: string[] = [];
    if (!name) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('senha');
    if (!cpf) missingFields.push('cpf');
    if (!birthDate) missingFields.push('data de nascimento');
    if (!address) missingFields.push('endereço');

    // children array replaces childrenCount; optional but validated in service

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
      children,
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
