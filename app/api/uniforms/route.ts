import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import { UNIFORM_CATEGORIES, UNIFORM_GENDERS } from '@/src/lib/models/uniform';
import { createUniform, listUniforms } from '@/src/services/uniform.service';
import { UNIFORM_ITEM_KINDS } from '@/src/types/uniform';
import type { UniformCategory, UniformGender, UniformItemDTO } from '@/src/types/uniform';

function parseUniformItems(value: unknown): UniformItemDTO[] | undefined {
  if (value === undefined) return undefined;
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

  return parsed.length > 0 ? parsed : undefined;
}

export async function GET() {
  try {
    const data = await listUniforms();
    return ok(data);
  } catch (error) {
    console.error('Failed to list uniforms', error);
    return serverError('Não foi possível carregar os uniformes.');
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

    const { name, description, category, gender, price, sizes, items, imageSrc, imageAlt } =
      payload as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome do uniforme é obrigatório.');
    }

    if (typeof category !== 'string' || !UNIFORM_CATEGORIES.includes(category as UniformCategory)) {
      return badRequest('Categoria inválida.');
    }

    if (typeof gender !== 'string' || !UNIFORM_GENDERS.includes(gender as UniformGender)) {
      return badRequest('Gênero inválido.');
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return badRequest('Preço deve ser maior que zero.');
    }

    if (description !== undefined && typeof description !== 'string') {
      return badRequest('Descrição inválida.');
    }

    if (imageSrc !== undefined && typeof imageSrc !== 'string') {
      return badRequest('Imagem inválida.');
    }

    if (imageAlt !== undefined && typeof imageAlt !== 'string') {
      return badRequest('Texto alternativo inválido.');
    }

    let resolvedSizes: string[] | undefined;
    if (sizes !== undefined) {
      if (!Array.isArray(sizes) || !sizes.every(size => typeof size === 'string')) {
        return badRequest('Tamanhos devem ser uma lista de strings.');
      }
      resolvedSizes = sizes as string[];
    }

    let resolvedItems: UniformItemDTO[] | undefined;
    try {
      resolvedItems = parseUniformItems(items);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : 'Itens inválidos.');
    }

    if (!resolvedItems && (!resolvedSizes || resolvedSizes.length === 0)) {
      return badRequest('Informe ao menos um item com tamanhos, ou uma lista de tamanhos.');
    }

    const created = await createUniform({
      name,
      description: description as string | undefined,
      category: category as UniformCategory,
      gender: gender as UniformGender,
      price: numericPrice,
      sizes: resolvedSizes,
      items: resolvedItems,
      imageSrc: imageSrc as string | undefined,
      imageAlt: imageAlt as string | undefined,
    });

    return ok(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create uniform', error);

    return serverError('Não foi possível criar o uniforme.');
  }
}
