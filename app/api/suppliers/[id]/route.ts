import type { NextRequest } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { deleteSupplier, updateSupplier } from '@/src/services/supplier.service';

type ParamsPromise = Promise<Record<string, string | string[] | undefined>>;

async function resolveSupplierId(paramsPromise: ParamsPromise) {
  let params: Record<string, string | string[] | undefined>;
  try {
    params = await paramsPromise;
  } catch (error) {
    console.error('Failed to resolve supplier params', error);
    return undefined;
  }

  const id = params?.id;
  if (!id) {
    return undefined;
  }

  return Array.isArray(id) ? id[0] : id;
}

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  const supplierId = await resolveSupplierId(params);
  if (!supplierId) {
    return badRequest('ID do fornecedor é obrigatório.');
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

    const { name, specialty, leadTimeDays, rating, contactEmail, phone, schoolIds } = payload as {
      name?: unknown;
      specialty?: unknown;
      leadTimeDays?: unknown;
      rating?: unknown;
      contactEmail?: unknown;
      phone?: unknown;
      schoolIds?: unknown;
    };

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return badRequest('Nome inválido.');
      }
      updates.name = name;
    }

    if (specialty !== undefined) {
      if (typeof specialty !== 'string') {
        return badRequest('Especialidade inválida.');
      }
      updates.specialty = specialty;
    }

    if (leadTimeDays !== undefined) {
      const numericLeadTime = Number(leadTimeDays);
      if (!Number.isFinite(numericLeadTime) || numericLeadTime < 0) {
        return badRequest('Lead time inválido.');
      }
      updates.leadTimeDays = numericLeadTime;
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 0 || numericRating > 5) {
        return badRequest('Avaliação deve estar entre 0 e 5.');
      }
      updates.rating = numericRating;
    }

    if (contactEmail !== undefined) {
      if (typeof contactEmail !== 'string') {
        return badRequest('Email inválido.');
      }
      updates.contactEmail = contactEmail;
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return badRequest('Telefone inválido.');
      }
      updates.phone = phone;
    }

    if (schoolIds !== undefined) {
      if (!Array.isArray(schoolIds) || !schoolIds.every(id => typeof id === 'string')) {
        return badRequest('IDs de escola devem ser uma lista de strings.');
      }
      updates.schoolIds = schoolIds as string[];
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('Nenhum campo válido para atualizar.');
    }

    const updated = await updateSupplier(supplierId, updates);
    if (!updated) {
      return notFound('Fornecedor não encontrado.');
    }

    return ok(updated);
  } catch (error) {
    console.error('Failed to update supplier', error);
    const message =
      error instanceof Error && error.message.includes('não existem')
        ? error.message
        : 'Não foi possível atualizar o fornecedor.';
    if (error instanceof Error && error.message.includes('não existem')) {
      return badRequest(message);
    }

    return serverError(message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: ParamsPromise }) {
  const supplierId = await resolveSupplierId(params);
  if (!supplierId) {
    return badRequest('ID do fornecedor é obrigatório.');
  }

  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const deleted = await deleteSupplier(supplierId);
    if (!deleted) {
      return notFound('Fornecedor não encontrado.');
    }

    return ok(deleted);
  } catch (error) {
    console.error('Failed to delete supplier', error);
    return serverError('Não foi possível excluir o fornecedor.');
  }
}
