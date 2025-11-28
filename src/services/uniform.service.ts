import { Types, type FilterQuery, type LeanDocument, type UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SupplierModel from '@/src/lib/models/supplier';
import UniformModel, { type UniformDocument } from '@/src/lib/models/uniform';

export type CreateUniformInput = {
  name: string;
  description?: string;
  supplierId: string;
  sizes?: string[];
  imageSrc?: string;
  imageAlt?: string;
};

export type UpdateUniformInput = Partial<CreateUniformInput>;

type SerializableUniform = UniformDocument | LeanDocument<UniformDocument>;

function serializeUniform(doc: SerializableUniform) {
  const { _id, __v, supplierId, ...rest } = 'toObject' in doc ? doc.toObject() : doc;
  return {
    id: _id.toString(),
    supplierId: supplierId.toString(),
    ...rest,
  } as {
    id: string;
    name: string;
    description?: string;
    supplierId: string;
    sizes: string[];
    imageSrc?: string;
    imageAlt?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

async function ensureSupplierExists(supplierId: string) {
  const exists = await SupplierModel.exists({ _id: supplierId }).exec();
  if (!exists) {
    throw new Error('Fornecedor não encontrado.');
  }
}

export async function listUniforms(filter: FilterQuery<UniformDocument> = {}) {
  await dbConnect();
  const results = await UniformModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  return results.map(serializeUniform);
}

export async function getUniformById(id: string) {
  await dbConnect();
  const result = await UniformModel.findById(id).exec();
  return result ? serializeUniform(result) : null;
}

export async function createUniform(input: CreateUniformInput) {
  await dbConnect();
  await ensureSupplierExists(input.supplierId);
  const created = await UniformModel.create({
    name: input.name.trim(),
    description: input.description?.trim(),
    supplierId: new Types.ObjectId(input.supplierId),
    sizes: input.sizes ?? [],
    imageSrc: input.imageSrc?.trim(),
    imageAlt: input.imageAlt?.trim(),
  });

  return serializeUniform(created);
}

export async function updateUniform(id: string, updates: UpdateUniformInput) {
  await dbConnect();
  const updateQuery: UpdateQuery<UniformDocument> = {};

  if (updates.name !== undefined) {
    updateQuery.name = updates.name.trim();
  }

  if (updates.description !== undefined) {
    updateQuery.description = updates.description?.trim() ?? null;
  }

  if (updates.supplierId !== undefined) {
    await ensureSupplierExists(updates.supplierId);
    updateQuery.supplierId = new Types.ObjectId(updates.supplierId);
  }

  if (updates.sizes !== undefined) {
    updateQuery.sizes = updates.sizes;
  }

  if (updates.imageSrc !== undefined) {
    updateQuery.imageSrc = updates.imageSrc?.trim() ?? null;
  }

  if (updates.imageAlt !== undefined) {
    updateQuery.imageAlt = updates.imageAlt?.trim() ?? null;
  }

  const updated = await UniformModel.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
  }).exec();

  return updated ? serializeUniform(updated) : null;
}

export async function deleteUniform(id: string) {
  await dbConnect();
  const deleted = await UniformModel.findByIdAndDelete(id).exec();
  return deleted ? serializeUniform(deleted) : null;
}

export { serializeUniform };
