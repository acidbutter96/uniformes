import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/lib/models/school';
import { createSchool, listSchools } from '@/src/services/school.service';

const VALID_STATUS = new Set<SchoolStatus>(SCHOOL_STATUSES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const data = await listSchools();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list schools', error);
    return NextResponse.json({ error: 'Não foi possível carregar as escolas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
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
      return badRequest('Nome da escola é obrigatório.');
    }

    if (typeof city !== 'string' || !city.trim()) {
      return badRequest('Cidade é obrigatória.');
    }

    const numericStudents = Number(students);
    if (!Number.isFinite(numericStudents) || numericStudents <= 0) {
      return badRequest('Número de alunos deve ser maior que zero.');
    }

    let resolvedStatus: SchoolStatus | undefined;
    if (status !== undefined) {
      if (typeof status !== 'string' || !VALID_STATUS.has(status as SchoolStatus)) {
        return badRequest('Status inválido.');
      }
      resolvedStatus = status as SchoolStatus;
    }

    const created = await createSchool({
      name,
      city,
      students: numericStudents,
      status: resolvedStatus,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create school', error);
    return NextResponse.json({ error: 'Não foi possível criar a escola.' }, { status: 500 });
  }
}
