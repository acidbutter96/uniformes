import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/lib/models/school';
import { deleteSchool, updateSchool } from '@/src/services/school.service';

const VALID_STATUS = new Set<SchoolStatus>(SCHOOL_STATUSES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const schoolId = params?.id;
  if (!schoolId) {
    return badRequest('ID da escola é obrigatório.');
  }

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

    const updates: Record<string, unknown> = {};

    if (typeof name === 'string') {
      if (!name.trim()) {
        return badRequest('Nome inválido.');
      }
      updates.name = name;
    } else if (name !== undefined) {
      return badRequest('Nome inválido.');
    }

    if (typeof city === 'string') {
      if (!city.trim()) {
        return badRequest('Cidade inválida.');
      }
      updates.city = city;
    } else if (city !== undefined) {
      return badRequest('Cidade inválida.');
    }

    if (students !== undefined) {
      const numericStudents = Number(students);
      if (!Number.isFinite(numericStudents) || numericStudents <= 0) {
        return badRequest('Número de alunos deve ser maior que zero.');
      }
      updates.students = numericStudents;
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !VALID_STATUS.has(status as SchoolStatus)) {
        return badRequest('Status inválido.');
      }
      updates.status = status as SchoolStatus;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('Nenhum campo válido para atualizar.');
    }

    const updated = await updateSchool(schoolId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Escola não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update school', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a escola.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const schoolId = params?.id;
  if (!schoolId) {
    return badRequest('ID da escola é obrigatório.');
  }

  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const deleted = await deleteSchool(schoolId);
    if (!deleted) {
      return NextResponse.json({ error: 'Escola não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ data: deleted });
  } catch (error) {
    console.error('Failed to delete school', error);
    return NextResponse.json({ error: 'Não foi possível excluir a escola.' }, { status: 500 });
  }
}
