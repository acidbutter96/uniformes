import { NextRequest } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import { createSupplier } from '@/src/services/supplier.service';

export async function POST(request: NextRequest) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const payload = (await request.json().catch(() => null)) as {
      name?: unknown;
      cnpj?: unknown;
      specialty?: unknown;
      phone?: unknown;
      leadTimeDays?: unknown;
      rating?: unknown;
      contactEmail?: unknown;
    } | null;

    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { name, cnpj, specialty, phone, leadTimeDays, rating, contactEmail } = payload;

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome do fornecedor é obrigatório.');
    }

    if (cnpj !== undefined && typeof cnpj !== 'string') {
      return badRequest('CNPJ inválido.');
    }

    if (specialty !== undefined && typeof specialty !== 'string') {
      return badRequest('Especialidade inválida.');
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return badRequest('Telefone inválido.');
    }

    if (
      leadTimeDays !== undefined &&
      (!Number.isFinite(Number(leadTimeDays)) || Number(leadTimeDays) < 0)
    ) {
      return badRequest('Lead time inválido.');
    }

    if (
      rating !== undefined &&
      (!Number.isFinite(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)
    ) {
      return badRequest('Avaliação deve estar entre 0 e 5.');
    }

    if (contactEmail !== undefined && typeof contactEmail !== 'string') {
      return badRequest('Email de contato inválido.');
    }

    const supplier = await createSupplier({
      name,
      cnpj,
      specialty,
      phone,
      leadTimeDays: leadTimeDays !== undefined ? Number(leadTimeDays) : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
      contactEmail,
      status: 'pending',
    });

    return ok(supplier);
  } catch (error) {
    console.error('Failed to create supplier by admin', error);
    return serverError('Não foi possível cadastrar o fornecedor.');
  }
}
