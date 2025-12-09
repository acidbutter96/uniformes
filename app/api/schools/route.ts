import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/lib/models/school';
import { createSchool, listSchools } from '@/src/services/school.service';

const VALID_STATUS = new Set<SchoolStatus>(SCHOOL_STATUSES);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const all = url.searchParams.get('all');
    const statusParam = url.searchParams.get('status');

    let data;
    // If `all=true`, do not filter by status
    if (all === 'true') {
      data = await listSchools();
    } else {
      // When a valid `status` is provided, filter by it; otherwise default to 'ativo'
      const desiredStatus =
        statusParam && (VALID_STATUS as Set<string>).has(statusParam) ? statusParam : 'ativo';
      data = await listSchools({ status: desiredStatus as SchoolStatus });
    }

    return ok(data);
  } catch (error) {
    console.error('Failed to list schools', error);
    return serverError('Não foi possível carregar as escolas.');
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

    return ok(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create school', error);
    return serverError('Não foi possível criar a escola.');
  }
}
