import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { createSupplier, listSuppliers } from '@/src/services/supplier.service';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const data = await listSuppliers();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list suppliers', error);
    return NextResponse.json({ error: 'Não foi possível carregar fornecedores.' }, { status: 500 });
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

    const { name, specialty, leadTimeDays, rating, contactEmail, phone, schoolIds } = payload as {
      name?: unknown;
      specialty?: unknown;
      leadTimeDays?: unknown;
      rating?: unknown;
      contactEmail?: unknown;
      phone?: unknown;
      schoolIds?: unknown;
    };

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome do fornecedor é obrigatório.');
    }

    if (specialty !== undefined && typeof specialty !== 'string') {
      return badRequest('Especialidade inválida.');
    }

    let resolvedLeadTime: number | undefined;
    if (leadTimeDays !== undefined) {
      const numericLeadTime = Number(leadTimeDays);
      if (!Number.isFinite(numericLeadTime) || numericLeadTime < 0) {
        return badRequest('Lead time inválido.');
      }
      resolvedLeadTime = numericLeadTime;
    }

    let resolvedRating: number | undefined;
    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 0 || numericRating > 5) {
        return badRequest('Avaliação deve estar entre 0 e 5.');
      }
      resolvedRating = numericRating;
    }

    if (contactEmail !== undefined && typeof contactEmail !== 'string') {
      return badRequest('Email inválido.');
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return badRequest('Telefone inválido.');
    }

    let resolvedSchoolIds: string[] | undefined;
    if (schoolIds !== undefined) {
      if (!Array.isArray(schoolIds) || !schoolIds.every(id => typeof id === 'string')) {
        return badRequest('IDs de escolas devem ser uma lista de strings.');
      }
      resolvedSchoolIds = schoolIds as string[];
    }

    const created = await createSupplier({
      name,
      specialty: specialty as string | undefined,
      leadTimeDays: resolvedLeadTime,
      rating: resolvedRating,
      contactEmail: contactEmail as string | undefined,
      phone: phone as string | undefined,
      schoolIds: resolvedSchoolIds,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create supplier', error);
    const message =
      error instanceof Error && error.message.includes('não existem')
        ? error.message
        : 'Não foi possível criar o fornecedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
