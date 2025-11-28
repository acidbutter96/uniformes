import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { createUniform, listUniforms } from '@/src/services/uniform.service';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const data = await listUniforms();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list uniforms', error);
    return NextResponse.json({ error: 'Não foi possível carregar os uniformes.' }, { status: 500 });
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

    const { name, description, supplierId, sizes, imageSrc, imageAlt } = payload as {
      name?: unknown;
      description?: unknown;
      supplierId?: unknown;
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
      sizes: resolvedSizes,
      imageSrc: imageSrc as string | undefined,
      imageAlt: imageAlt as string | undefined,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create uniform', error);
    if (error instanceof Error && error.message.includes('Fornecedor não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Não foi possível criar o uniforme.' }, { status: 500 });
  }
}
