import type { NextRequest } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/lib/models/school';
import { deleteSchool, updateSchool } from '@/src/services/school.service';

const VALID_STATUS = new Set<SchoolStatus>(SCHOOL_STATUSES);

type ParamsPromise = Promise<Record<string, string | string[] | undefined>>;

async function resolveSchoolId(paramsPromise: ParamsPromise) {
  let params: Record<string, string | string[] | undefined>;
  try {
    params = await paramsPromise;
  } catch (error) {
    console.error('Failed to resolve school params', error);
    return undefined;
  }

  const id = params?.id;
  if (!id) {
    return undefined;
  }

  return Array.isArray(id) ? id[0] : id;
}

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  const schoolId = await resolveSchoolId(params);
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
      return notFound('Escola não encontrada.');
    }

    return ok(updated);
  } catch (error) {
    console.error('Failed to update school', error);
    return serverError('Não foi possível atualizar a escola.');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: ParamsPromise }) {
  const schoolId = await resolveSchoolId(params);
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
      return notFound('Escola não encontrada.');
    }

    return ok(deleted);
  } catch (error) {
    console.error('Failed to delete school', error);
    return serverError('Não foi possível excluir a escola.');
  }
}
