import { NextResponse } from 'next/server';

import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/lib/models/school';
import { verifyAccessToken } from '@/src/services/auth.service';
import { createSchool, listSchools, serializeSchool } from '@/src/services/school.service';

const VALID_STATUS = new Set<SchoolStatus>(SCHOOL_STATUSES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type TokenPayload = {
  role?: string;
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
    console.error('Schools admin auth error', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function GET() {
  try {
    const schools = await listSchools();
    return NextResponse.json({
      data: schools.map(item => serializeSchool(item)),
    });
  } catch (error) {
    console.error('Failed to list schools', error);
    return NextResponse.json({ error: 'Não foi possível carregar as escolas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = ensureAdminAccess(request);
    if (authError) {
      return authError;
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { name, city, students, status } = payload as {
      name?: unknown;
      city?: unknown;
      students?: unknown;
      status?: unknown;
    };

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome é obrigatório.');
    }

    if (typeof city !== 'string' || !city.trim()) {
      return badRequest('Cidade é obrigatória.');
    }

    const numericStudents = Number(students);
    if (!Number.isFinite(numericStudents) || numericStudents <= 0) {
      return badRequest('Número de alunos deve ser maior que zero.');
    }

    let parsedStatus: SchoolStatus | undefined;
    if (typeof status === 'string') {
      if (!VALID_STATUS.has(status as SchoolStatus)) {
        return badRequest('Status inválido.');
      }
      parsedStatus = status as SchoolStatus;
    }

    const created = await createSchool({
      name: name.trim(),
      city: city.trim(),
      students: numericStudents,
      status: parsedStatus,
    });

    return NextResponse.json({ data: serializeSchool(created) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create school', error);
    return NextResponse.json({ error: 'Não foi possível criar a escola.' }, { status: 500 });
  }
}
