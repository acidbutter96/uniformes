import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { verifyAccessToken, isValidCpf } from '@/src/services/auth.service';
import { getById, updateUser } from '@/src/services/user.service';
import { getSupplierById } from '@/src/services/supplier.service';

export async function GET(request: Request) {
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

    const user = await getById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.verified) {
      return NextResponse.json(
        {
          error: 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
          verificationRequired: true,
          email: user.email,
        },
        { status: 403 },
      );
    }

    const { password: removedPassword, ...safeUser } = user.toObject();
    void removedPassword;

    // If supplier, attach supplier details in response
    let supplier: unknown = undefined;
    if (safeUser.role === 'supplier' && safeUser.supplierId) {
      try {
        const s = await getSupplierById(safeUser.supplierId.toString());
        if (s) supplier = s;
      } catch (err) {
        console.error('Failed to load supplier for current user', err);
      }
    }

    return NextResponse.json({ data: { ...safeUser, supplier } });
  } catch (error) {
    console.error('Auth me error', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
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

    const currentUser = await getById(payload.sub);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!currentUser.verified) {
      return NextResponse.json(
        {
          error: 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
          verificationRequired: true,
          email: currentUser.email,
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const allowed: Record<string, unknown> = {};
    if (typeof body?.name === 'string') allowed.name = body.name;
    // Email changes must be confirmed via email. Use POST /api/auth/request-email-change.
    if (body?.birthDate) {
      const d = new Date(body.birthDate);
      if (!Number.isNaN(d.valueOf())) allowed.birthDate = d;
    }
    if (body?.address && typeof body.address === 'object') {
      const a = body.address as Record<string, unknown>;
      allowed.address = {
        cep: typeof a.cep === 'string' ? a.cep : undefined,
        street: typeof a.street === 'string' ? a.street : undefined,
        number: typeof a.number === 'string' ? a.number : undefined,
        complement: typeof a.complement === 'string' ? a.complement : undefined,
        district: typeof a.district === 'string' ? a.district : undefined,
        city: typeof a.city === 'string' ? a.city : undefined,
        state: typeof a.state === 'string' ? a.state : undefined,
      };
    }

    // Allow updating children (replace entire children array)
    if (Array.isArray(body?.children)) {
      const raw = body.children as unknown[];
      const parsed: Array<{ _id?: string; name: string; age: number; schoolId: string }> = [];
      for (const item of raw) {
        if (!item || typeof item !== 'object') {
          return NextResponse.json({ error: 'Dados de aluno inválidos.' }, { status: 400 });
        }
        const it = item as Record<string, unknown>;
        const id = typeof it.id === 'string' && it.id.trim() ? it.id.trim() : undefined;
        const name = typeof it.name === 'string' ? it.name.trim() : '';
        const age = Number(it.age);
        const schoolId = typeof it.schoolId === 'string' ? it.schoolId.trim() : '';

        if (id && !Types.ObjectId.isValid(id)) {
          return NextResponse.json({ error: 'Dados de aluno inválidos.' }, { status: 400 });
        }

        if (!schoolId || !Types.ObjectId.isValid(schoolId)) {
          return NextResponse.json({ error: 'Dados de aluno inválidos.' }, { status: 400 });
        }

        if (!name || !Number.isFinite(age) || age < 0) {
          return NextResponse.json({ error: 'Dados de aluno inválidos.' }, { status: 400 });
        }

        // Preserve the child's _id when provided so flows can keep referring to the same child.
        parsed.push({ _id: id, name, age, schoolId });
      }
      allowed.children = parsed as unknown as typeof allowed.children;
    }

    // Permitir definir CPF apenas se ainda não existir
    if (typeof body?.cpf === 'string') {
      const existingCpf = (currentUser.cpf ?? '').trim();
      const incomingCpf = body.cpf.trim();

      if (!existingCpf && incomingCpf) {
        // sanitize: keep only digits
        const sanitized = incomingCpf.replace(/\D/g, '');
        if (!isValidCpf(sanitized)) {
          return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 });
        }
        allowed.cpf = sanitized;
      }
    }

    const updated = await updateUser(payload.sub, allowed);
    if (!updated) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { password: removedPassword, ...safeUser } = updated.toObject();
    void removedPassword;
    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Auth me patch error', error);
    return NextResponse.json({ error: 'Bad Request.' }, { status: 400 });
  }
}
