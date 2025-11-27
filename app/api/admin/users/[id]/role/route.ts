import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/src/services/auth.service';
import { updateUser } from '@/src/services/user.service';

type TokenPayload = {
  sub?: string;
  role?: string;
};

type RouteParamsContext = {
  params: Promise<unknown>;
};

function ensureAdminAccess(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = verifyAccessToken<TokenPayload>(token);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error('Admin users role auth error', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: RouteParamsContext) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  const params = (await context.params) as
    | Record<string, string | string[] | undefined>
    | undefined;
  const rawUserId = params?.id;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const nextRole = body?.role;

    if (nextRole !== 'admin' && nextRole !== 'user') {
      return NextResponse.json({ error: 'Role inválida.' }, { status: 400 });
    }

    const updated = await updateUser(userId, { role: nextRole });
    if (!updated) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const serialized = updated.toObject() as unknown as Record<string, unknown> & {
      _id?: unknown;
      password?: unknown;
      __v?: unknown;
    };
    delete serialized.password;
    delete serialized.__v;
    const rawId = serialized._id;
    delete serialized._id;

    return NextResponse.json({
      data: { id: rawId?.toString?.() ?? String(rawId ?? ''), ...serialized },
    });
  } catch (error) {
    console.error('Failed to update user role', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a função.' }, { status: 500 });
  }
}
