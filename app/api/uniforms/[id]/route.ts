import type { NextRequest } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { UNIFORM_CATEGORIES, UNIFORM_GENDERS } from '@/src/lib/models/uniform';
import { deleteUniform, updateUniform } from '@/src/services/uniform.service';
import { UNIFORM_ITEM_KINDS } from '@/src/types/uniform';
import type { UniformCategory, UniformGender, UniformItemDTO } from '@/src/types/uniform';

function parseUniformItems(value: unknown): UniformItemDTO[] {
  if (!Array.isArray(value)) {
    throw new Error('Itens devem ser uma lista.');
  }

  const parsed = value
    .map(item => {
      if (!item || typeof item !== 'object') {
        throw new Error('Item inválido.');
      }

      const kind = (item as Record<string, unknown>).kind;
      const quantity = (item as Record<string, unknown>).quantity;
      const sizes = (item as Record<string, unknown>).sizes;

      if (typeof kind !== 'string' || !UNIFORM_ITEM_KINDS.includes(kind as never)) {
        throw new Error('Tipo de item inválido.');
      }

      const resolvedQuantity = quantity === undefined ? 1 : Number(quantity);
      if (!Number.isFinite(resolvedQuantity) || resolvedQuantity < 1) {
        throw new Error('Quantidade inválida.');
      }

      if (!Array.isArray(sizes) || !sizes.every(size => typeof size === 'string' && size.trim())) {
        throw new Error('Tamanhos do item devem ser uma lista de strings.');
      }

      return {
        kind: kind as UniformItemDTO['kind'],
        quantity: Math.floor(resolvedQuantity),
        sizes: (sizes as string[]).map(size => size.trim()).filter(Boolean),
      } satisfies UniformItemDTO;
    })
    .filter(item => item.sizes.length > 0);

  if (parsed.length === 0) {
    throw new Error('Informe ao menos um item com tamanhos.');
  }

  return parsed;
}

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

    const { name, description, category, gender, price, sizes, items, imageSrc, imageAlt } =
      payload as {
        name?: unknown;
        description?: unknown;
        category?: unknown;
        gender?: unknown;
        price?: unknown;
        sizes?: unknown;
        items?: unknown;
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

    if (items !== undefined) {
      try {
        updates.items = parseUniformItems(items);
      } catch (error) {
        return badRequest(error instanceof Error ? error.message : 'Itens inválidos.');
      }
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
