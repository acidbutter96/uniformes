import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SchoolModel from '@/src/lib/models/school';
import SupplierModel, { type SupplierDocument } from '@/src/lib/models/supplier';
import UserModel from '@/src/lib/models/user';
import type { SupplierDTO } from '@/src/types/supplier';

export type CreateSupplierInput = {
  name: string;
  cnpj?: string;
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
  status?: 'active' | 'pending' | 'inactive' | 'suspended';
  schoolIds?: string[];
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

type SerializableSupplier = SupplierDocument;
type SupplierFilter = Parameters<(typeof SupplierModel)['find']>[0];

function toISOString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function serializeSupplier(doc: SerializableSupplier): SupplierDTO {
  const plain = doc.toObject() as SupplierDocument & {
    _id: Types.ObjectId;
    __v?: unknown;
    schoolIds?: Types.ObjectId[];
  };

  const { _id, schoolIds = [], createdAt, updatedAt, ...rest } = plain;
  const linkedSchoolIds = Array.isArray(schoolIds) ? schoolIds.map(item => item.toString()) : [];

  return {
    id: _id.toString(),
    schoolIds: linkedSchoolIds,
    ...rest,
    createdAt: toISOString(createdAt),
    updatedAt: toISOString(updatedAt),
  } satisfies SupplierDTO;
}

async function resolveSchoolIds(ids: string[] = []) {
  if (ids.length === 0) {
    return [];
  }

  const objectIds = ids.map(id => new Types.ObjectId(id));
  const count = await SchoolModel.countDocuments({ _id: { $in: objectIds } }).exec();
  if (count !== ids.length) {
    throw new Error('Algumas escolas informadas não existem.');
  }

  return objectIds;
}

export async function listSuppliers(filter: SupplierFilter = { status: 'active' }) {
  await dbConnect();
  const results = await SupplierModel.find(filter).sort({ name: 1 }).exec();

  const suppliers = results.map(serializeSupplier);
  const supplierObjectIds = suppliers
    .map(s => {
      try {
        return new Types.ObjectId(s.id);
      } catch {
        return null;
      }
    })
    .filter((id): id is Types.ObjectId => id !== null);

  if (supplierObjectIds.length === 0) {
    return suppliers;
  }

  type SupplierUserLean = {
    supplierId?: Types.ObjectId | null;
    address?: {
      street?: string;
      number?: string;
      district?: string;
      city?: string;
      state?: string;
    };
  };

  const supplierUsers = await UserModel.find({
    role: 'supplier',
    supplierId: { $in: supplierObjectIds },
  })
    .select({ supplierId: 1, address: 1 })
    .lean<SupplierUserLean[]>()
    .exec();

  const supplierAddressById = new Map<string, { address?: string; city?: string }>();
  for (const u of supplierUsers) {
    const supplierId = u?.supplierId ? u.supplierId.toString() : null;
    if (!supplierId) continue;
    if (supplierAddressById.has(supplierId)) continue;

    const street = (u.address?.street ?? '').trim();
    const number = (u.address?.number ?? '').trim();
    const district = (u.address?.district ?? '').trim();
    const city = (u.address?.city ?? '').trim();
    const state = (u.address?.state ?? '').trim();

    const addressParts = [street, number].filter(Boolean);
    const addressBase = addressParts.join(', ');
    const address = [addressBase, district].filter(Boolean).join(' - ') || undefined;
    const cityLabel = city ? `${city}${state ? ` - ${state}` : ''}` : undefined;

    supplierAddressById.set(supplierId, { address, city: cityLabel });
  }

  return suppliers.map(s => {
    const extra = supplierAddressById.get(s.id);
    return {
      ...s,
      address: extra?.address,
      city: extra?.city,
    };
  });
}

export async function getSupplierById(id: string) {
  await dbConnect();
  const result = await SupplierModel.findById(id).exec();
  return result ? serializeSupplier(result) : null;
}

export async function createSupplier(input: CreateSupplierInput) {
  await dbConnect();
  const schoolIds = await resolveSchoolIds(input.schoolIds ?? []);
  const created = await SupplierModel.create({
    name: input.name.trim(),
    cnpj: input.cnpj?.trim(),
    specialty: input.specialty?.trim(),
    leadTimeDays: input.leadTimeDays,
    rating: input.rating,
    contactEmail: input.contactEmail?.trim().toLowerCase(),
    phone: input.phone?.trim(),
    status: input.status ?? 'pending',
    schoolIds,
  });
  return serializeSupplier(created);
}

export async function updateSupplier(id: string, updates: UpdateSupplierInput) {
  await dbConnect();
  const updateQuery: UpdateQuery<SupplierDocument> = {};

  if (updates.name !== undefined) {
    updateQuery.name = updates.name.trim();
  }

  if (updates.cnpj !== undefined) {
    updateQuery.cnpj = updates.cnpj?.trim() ?? null;
  }

  if (updates.contactEmail !== undefined) {
    updateQuery.contactEmail = updates.contactEmail
      ? updates.contactEmail.trim().toLowerCase()
      : null;
  }

  if (updates.phone !== undefined) {
    updateQuery.phone = updates.phone?.trim() ?? null;
  }

  if (updates.specialty !== undefined) {
    updateQuery.specialty = updates.specialty?.trim() ?? null;
  }

  if (updates.leadTimeDays !== undefined) {
    updateQuery.leadTimeDays = updates.leadTimeDays;
  }

  if (updates.rating !== undefined) {
    updateQuery.rating = updates.rating;
  }

  if (updates.status !== undefined) {
    updateQuery.status = updates.status as SupplierDocument['status'];
  }

  if (updates.schoolIds !== undefined) {
    updateQuery.schoolIds = await resolveSchoolIds(updates.schoolIds);
  }

  const updated = await SupplierModel.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
  }).exec();

  return updated ? serializeSupplier(updated) : null;
}

export async function deleteSupplier(id: string) {
  await dbConnect();
  const deleted = await SupplierModel.findByIdAndDelete(id).exec();
  return deleted ? serializeSupplier(deleted) : null;
}
