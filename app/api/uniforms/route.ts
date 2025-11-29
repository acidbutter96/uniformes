import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { UNIFORM_CATEGORIES, UNIFORM_GENDERS } from '@/src/lib/models/uniform';
import { createUniform, listUniforms } from '@/src/services/uniform.service';
import type { UniformCategory, UniformGender } from '@/src/types/uniform';

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

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome do uniforme é obrigatório.');
    }

    if (typeof supplierId !== 'string' || !supplierId.trim()) {
      return badRequest('Fornecedor é obrigatório.');
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

    const created = await createUniform({
      name,
      description: description as string | undefined,
      supplierId,
      category: category as UniformCategory,
      gender: gender as UniformGender,
      price: numericPrice,
      sizes: resolvedSizes,
      imageSrc: imageSrc as string | undefined,
      imageAlt: imageAlt as string | undefined,
    });

    return ok(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create uniform', error);
    if (error instanceof Error && error.message.includes('Fornecedor não encontrado')) {
      return notFound(error.message);
    }

    return serverError('Não foi possível criar o uniforme.');
  }
}
