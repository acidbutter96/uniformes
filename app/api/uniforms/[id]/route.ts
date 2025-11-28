import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { deleteUniform, updateUniform } from '@/src/services/uniform.service';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const uniformId = params?.id;
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

    const { name, description, supplierId, sizes, imageSrc, imageAlt } = payload as {
      name?: unknown;
      description?: unknown;
      supplierId?: unknown;
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
      return NextResponse.json({ error: 'Uniforme não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update uniform', error);
    if (error instanceof Error && error.message.includes('Fornecedor não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Não foi possível atualizar o uniforme.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const uniformId = params?.id;
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
      return NextResponse.json({ error: 'Uniforme não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ data: deleted });
  } catch (error) {
    console.error('Failed to delete uniform', error);
    return NextResponse.json({ error: 'Não foi possível excluir o uniforme.' }, { status: 500 });
  }
}
