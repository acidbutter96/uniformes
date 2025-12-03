import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import dbConnect from '@/src/lib/database';
import SupplierModel from '@/src/lib/models/supplier';
import UserModel from '@/src/lib/models/user';

export async function GET(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    await dbConnect();

    // Get all supplierIds currently referenced by any user
    const referencedSupplierIds = (await UserModel.distinct('supplierId', {
      supplierId: { $ne: null },
    }).exec()) as Array<unknown>;

    // Filter out nulls and ensure proper type for query
    const usedIds = referencedSupplierIds.filter(id => id != null);

    // Find suppliers whose _id is not referenced by any user
    const suppliersWithoutUser = await SupplierModel.find({
      _id: { $nin: usedIds as never[] },
    })
      .sort({ name: 1 })
      .select({ name: 1 })
      .lean()
      .exec();

    const data = suppliersWithoutUser.map(s => ({
      id: (s as { _id: { toString: () => string } })._id.toString(),
      name: (s as { name?: string }).name ?? '',
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list suppliers without users', error);
    return NextResponse.json({ error: 'Não foi possível carregar fornecedores.' }, { status: 500 });
  }
}
