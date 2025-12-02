import { ensureUserAccess } from '@/app/api/utils/user-auth';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { getSupplierById, updateSupplier } from '@/src/services/supplier.service';

export async function GET(request: Request) {
  const auth = ensureUserAccess(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { sub: userId } = auth.payload;

  try {
    await dbConnect();
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return notFound('Usuário não encontrado.');
    }

    if (user.role !== 'supplier') {
      return badRequest('Apenas fornecedores podem acessar esta rota.');
    }

    if (!user.supplierId) {
      return ok({ schoolIds: [] });
    }

    const supplier = await getSupplierById(user.supplierId.toString());
    if (!supplier) {
      return notFound('Fornecedor não encontrado.');
    }

    return ok({ schoolIds: supplier.schoolIds });
  } catch (error) {
    console.error('Failed to load supplier schools for current user', error);
    return serverError('Não foi possível carregar escolas atendidas.');
  }
}

export async function PUT(request: Request) {
  const auth = ensureUserAccess(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { sub: userId } = auth.payload;

  try {
    const payload = (await request.json().catch(() => null)) as { schoolIds?: unknown } | null;

    if (!payload || !Array.isArray(payload.schoolIds)) {
      return badRequest('Payload inválido. É necessário enviar schoolIds como lista de strings.');
    }

    const schoolIds = payload.schoolIds;
    if (!schoolIds.every(id => typeof id === 'string')) {
      return badRequest('IDs de escola devem ser uma lista de strings.');
    }

    await dbConnect();
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return notFound('Usuário não encontrado.');
    }

    if (user.role !== 'supplier') {
      return badRequest('Apenas fornecedores podem acessar esta rota.');
    }

    if (!user.supplierId) {
      return badRequest('Usuário fornecedor não está vinculado a um registro de fornecedor.');
    }

    const updated = await updateSupplier(user.supplierId.toString(), { schoolIds });
    if (!updated) {
      return notFound('Fornecedor não encontrado.');
    }

    return ok({ schoolIds: updated.schoolIds });
  } catch (error) {
    console.error('Failed to update supplier schools for current user', error);
    if (error instanceof Error && error.message.includes('não existem')) {
      return badRequest(error.message);
    }

    return serverError('Não foi possível atualizar escolas atendidas.');
  }
}
