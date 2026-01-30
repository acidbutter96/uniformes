import { NextResponse } from 'next/server';

import { registerUser } from '@/src/services/auth.service';
import { sendVerifyEmailForUser } from '@/src/services/emailFlows.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { name, email, password, cpf, birthDate, address, children, student, role } = body ?? {};

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

    const { user } = await registerUser({
      name,
      email,
      password,
      cpf,
      birthDate,
      address,
      children,
      student,
      role,
    });

    const { password: removedPassword, ...safeUser } = user as unknown as Record<string, unknown>;
    void removedPassword;

    let emailSent = false;
    let emailError: string | undefined;

    // Send verification email for non-google signups
    const provider = safeUser?.provider as string;
    const isVerified = Boolean((safeUser as { verified?: boolean }).verified);

    if (provider !== 'google' && !isVerified) {
      try {
        const result = await sendVerifyEmailForUser({
          userId: String((safeUser as { _id?: unknown })._id ?? ''),
          email: String((safeUser as { email?: unknown }).email ?? ''),
        });
        emailSent = Boolean((result as { emailSent?: boolean }).emailSent);
        emailError = (result as { emailError?: string }).emailError;
      } catch (err) {
        console.error('Failed to send verification email after register', err);
        emailError = 'Não foi possível enviar e-mail de confirmação.';
      }
    }

    return NextResponse.json({ user: safeUser, verificationRequired: true, emailSent, emailError });
  } catch (error) {
    console.error('Register error', error);
    const message = error instanceof Error ? error.message : 'Unable to register user.';
    const status = error instanceof Error ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
