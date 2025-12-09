import { NextResponse } from 'next/server';

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

    const body = await request.json().catch(() => ({}));

    const allowed: Record<string, unknown> = {};
    if (typeof body?.name === 'string') allowed.name = body.name;
    if (typeof body?.email === 'string') allowed.email = body.email.toLowerCase().trim();
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

    // Permitir definir CPF apenas se ainda não existir
    if (typeof body?.cpf === 'string') {
      const current = await getById(payload.sub);
      if (!current) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }
      const existingCpf = (current.cpf ?? '').trim();
      const incomingCpf = body.cpf.trim();

      if (!existingCpf && incomingCpf) {
        // sanitize: keep only digits
        const sanitized = incomingCpf.replace(/\D/g, '');
        if (!isValidCpf(sanitized)) {
          return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 });
        }
        allowed.cpf = sanitized;
      }
      // If CPF already set, ignore any attempts to change it
    }

    // Permitir definir childrenCount apenas se ainda não existir
    if (body?.childrenCount !== undefined) {
      const current = await getById(payload.sub);
      if (!current) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }
      const existingChildren = current.childrenCount;
      const incoming = Number(body.childrenCount);
      // Allow setting when not set or equal to 0; lock when >= 1
      if (existingChildren == null || existingChildren <= 0) {
        if (!Number.isFinite(incoming) || incoming < 0 || !Number.isInteger(incoming)) {
          return NextResponse.json({ error: 'Quantidade de filhos inválida.' }, { status: 400 });
        }
        allowed.childrenCount = incoming;
      }
      // If already set, ignore attempts to change
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
