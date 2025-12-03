import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import { listSuppliers } from '@/src/services/supplier.service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeAll = url.searchParams.get('all') === '1';
    const data = includeAll ? await listSuppliers({}) : await listSuppliers();
    return ok(data);
  } catch (error) {
    console.error('Failed to list suppliers', error);
    return serverError('Não foi possível carregar fornecedores.');
  }
}

export async function POST() {
  // Supplier creation is no longer allowed via admin API.
  // Suppliers must self-register via the public registration flow.
  return badRequest('Criação de fornecedor via admin desativada. Use o cadastro público.');
}
