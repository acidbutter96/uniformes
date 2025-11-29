import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SupplierModel from '@/src/lib/models/supplier';
import UniformModel, {
  type UniformDocument,
  UNIFORM_CATEGORIES,
  UNIFORM_GENDERS,
} from '@/src/lib/models/uniform';
import type { UniformDTO, UniformCategory, UniformGender } from '@/src/types/uniform';

export type CreateUniformInput = {
  name: string;
  description?: string;
  supplierId: string;
  category: UniformCategory;
  gender: UniformGender;
  price: number;
  sizes?: string[];
  imageSrc?: string;
  imageAlt?: string;
};

export type UpdateUniformInput = Partial<CreateUniformInput>;

type SerializableUniform = UniformDocument;
type UniformFilter = Parameters<(typeof UniformModel)['find']>[0];

function toISOString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function serializeUniform(doc: SerializableUniform): UniformDTO {
  const plain = doc.toObject() as UniformDocument & {
    _id: Types.ObjectId;
    __v?: unknown;
    supplierId: Types.ObjectId;
  };

  const { _id, supplierId, createdAt, updatedAt, ...rest } = plain;

  return {
    id: _id.toString(),
    supplierId: supplierId.toString(),
    ...rest,
    createdAt: toISOString(createdAt),
    updatedAt: toISOString(updatedAt),
  } satisfies UniformDTO;
}

async function ensureSupplierExists(supplierId: string) {
  const exists = await SupplierModel.exists({ _id: supplierId }).exec();
  if (!exists) {
    throw new Error('Fornecedor não encontrado.');
  }
}

export async function listUniforms(filter: UniformFilter = {}) {
  await dbConnect();
  const results = await UniformModel.find(filter).sort({ createdAt: -1 }).exec();
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
    category: input.category,
    gender: input.gender,
    supplierId: new Types.ObjectId(input.supplierId),
    sizes: input.sizes ?? [],
    price: input.price,
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

  if (updates.category !== undefined) {
    if (!UNIFORM_CATEGORIES.includes(updates.category)) {
      throw new Error('Categoria de uniforme inválida.');
    }
    updateQuery.category = updates.category;
  }

  if (updates.gender !== undefined) {
    if (!UNIFORM_GENDERS.includes(updates.gender)) {
      throw new Error('Gênero de uniforme inválido.');
    }
    updateQuery.gender = updates.gender;
  }

  if (updates.supplierId !== undefined) {
    await ensureSupplierExists(updates.supplierId);
    updateQuery.supplierId = new Types.ObjectId(updates.supplierId);
  }

  if (updates.sizes !== undefined) {
    updateQuery.sizes = updates.sizes;
  }

  if (updates.price !== undefined) {
    updateQuery.price = updates.price;
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
