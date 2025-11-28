import { Types, type FilterQuery, type LeanDocument, type UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SchoolModel from '@/src/lib/models/school';
import SupplierModel, { type SupplierDocument } from '@/src/lib/models/supplier';

export type CreateSupplierInput = {
  name: string;
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
  schoolIds?: string[];
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

type SerializableSupplier = SupplierDocument | LeanDocument<SupplierDocument>;

function serializeSupplier(doc: SerializableSupplier) {
  const plain = ('toObject' in doc ? doc.toObject() : doc) as SupplierDocument & {
    _id: Types.ObjectId;
    __v?: unknown;
    schoolIds?: Types.ObjectId[];
  };

  const { _id, __v, schoolIds = [], ...rest } = plain;
  const linkedSchoolIds = Array.isArray(schoolIds)
    ? schoolIds.map(item => item.toString())
    : [];

  return {
    id: _id.toString(),
    schoolIds: linkedSchoolIds,
    ...rest,
  } as {
    id: string;
    name: string;
    specialty?: string;
    leadTimeDays?: number;
    rating?: number;
    contactEmail?: string;
    phone?: string;
    schoolIds: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
  };
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

export async function listSuppliers(filter: FilterQuery<SupplierDocument> = {}) {
  await dbConnect();
  const results = await SupplierModel.find(filter).sort({ name: 1 }).lean().exec();
  return results.map(serializeSupplier);
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
    specialty: input.specialty?.trim(),
    leadTimeDays: input.leadTimeDays,
    rating: input.rating,
    contactEmail: input.contactEmail?.trim().toLowerCase(),
    phone: input.phone?.trim(),
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

  if (updates.contactEmail !== undefined) {
    updateQuery.contactEmail = updates.contactEmail ? updates.contactEmail.trim().toLowerCase() : null;
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

export { serializeSupplier };
