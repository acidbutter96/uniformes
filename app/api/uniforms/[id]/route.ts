import type { NextRequest } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { UNIFORM_CATEGORIES, UNIFORM_GENDERS } from '@/src/lib/models/uniform';
import { deleteUniform, updateUniform } from '@/src/services/uniform.service';
import type { UniformCategory, UniformGender } from '@/src/types/uniform';

type ParamsPromise = Promise<Record<string, string | string[] | undefined>>;

async function resolveUniformId(paramsPromise: ParamsPromise) {
  let params: Record<string, string | string[] | undefined>;
  try {
    params = await paramsPromise;
  } catch (error) {
    console.error('Failed to resolve uniform params', error);
    return undefined;
  }

  const id = params?.id;
  if (!id) {
    return undefined;
  }

  return Array.isArray(id) ? id[0] : id;
}

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  const uniformId = await resolveUniformId(params);
  if (!uniformId) {
    return badRequest('ID do uniforme é obrigatório.');
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

    const { name, description, supplierId, category, gender, price, sizes, imageSrc, imageAlt } =
      payload as {
        name?: unknown;
        description?: unknown;
        supplierId?: unknown;
        category?: unknown;
        gender?: unknown;
        price?: unknown;
        sizes?: unknown;
        imageSrc?: unknown;
        imageAlt?: unknown;
      };

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return badRequest('Nome inválido.');
      }
      updates.name = name;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return badRequest('Descrição inválida.');
      }
      updates.description = description;
    }

    if (supplierId !== undefined) {
      if (typeof supplierId !== 'string' || !supplierId.trim()) {
        return badRequest('Fornecedor inválido.');
      }
      updates.supplierId = supplierId;
    }

    if (category !== undefined) {
      if (
        typeof category !== 'string' ||
        !UNIFORM_CATEGORIES.includes(category as UniformCategory)
      ) {
        return badRequest('Categoria inválida.');
      }
      updates.category = category as UniformCategory;
    }

    if (gender !== undefined) {
      if (typeof gender !== 'string' || !UNIFORM_GENDERS.includes(gender as UniformGender)) {
        return badRequest('Gênero inválido.');
      }
      updates.gender = gender as UniformGender;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return badRequest('Preço deve ser maior que zero.');
      }
      updates.price = numericPrice;
    }

    if (sizes !== undefined) {
      if (!Array.isArray(sizes) || !sizes.every(item => typeof item === 'string')) {
        return badRequest('Tamanhos devem ser uma lista de strings.');
      }
      updates.sizes = sizes;
    }

    if (imageSrc !== undefined) {
      if (typeof imageSrc !== 'string') {
        return badRequest('Imagem inválida.');
      }
      updates.imageSrc = imageSrc;
    }

    if (imageAlt !== undefined) {
      if (typeof imageAlt !== 'string') {
        return badRequest('Texto alternativo inválido.');
      }
      updates.imageAlt = imageAlt;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('Nenhum campo válido para atualizar.');
    }

    const updated = await updateUniform(uniformId, updates);
    if (!updated) {
      return notFound('Uniforme não encontrado.');
    }

    return ok(updated);
  } catch (error) {
    console.error('Failed to update uniform', error);
    if (error instanceof Error && error.message.includes('Fornecedor não encontrado')) {
      return notFound(error.message);
    }

    return serverError('Não foi possível atualizar o uniforme.');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: ParamsPromise }) {
  const uniformId = await resolveUniformId(params);
  if (!uniformId) {
    return badRequest('ID do uniforme é obrigatório.');
  }

  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const deleted = await deleteUniform(uniformId);
    if (!deleted) {
      return notFound('Uniforme não encontrado.');
    }

    return ok(deleted);
  } catch (error) {
    console.error('Failed to delete uniform', error);
    return serverError('Não foi possível excluir o uniforme.');
  }
}
