import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import UniformModel, {
  type UniformDocument,
  UNIFORM_CATEGORIES,
  UNIFORM_GENDERS,
} from '@/src/lib/models/uniform';
import type {
  UniformDTO,
  UniformCategory,
  UniformGender,
  UniformItemDTO,
} from '@/src/types/uniform';

export type CreateUniformInput = {
  name: string;
  description?: string;
  category: UniformCategory;
  gender: UniformGender;
  price: number;
  sizes?: string[];
  items?: UniformItemDTO[];
  imageSrc?: string;
  imageAlt?: string;
};

export type UpdateUniformInput = Partial<CreateUniformInput>;

type SerializableUniform = UniformDocument;
type UniformFilter = Parameters<(typeof UniformModel)['find']>[0];

function normalizeItems(items: UniformItemDTO[] | undefined): UniformItemDTO[] | undefined {
  if (!items) return undefined;

  const normalized = items
    .map(item => ({
      kind: item.kind,
      quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
      sizes: Array.isArray(item.sizes)
        ? item.sizes.map(size => String(size).trim()).filter(Boolean)
        : [],
    }))
    .filter(item => item.sizes.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function deriveLegacySizes(items: UniformItemDTO[] | undefined, legacySizes: string[] | undefined) {
  if (Array.isArray(legacySizes) && legacySizes.length > 0) {
    return legacySizes;
  }

  const fromItems = items?.flatMap(item => item.sizes) ?? [];
  return Array.from(new Set(fromItems));
}

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
    items?: Array<{
      _id?: Types.ObjectId;
      kind: UniformItemDTO['kind'];
      quantity: number;
      sizes: string[];
    }>;
  };

  const { _id, createdAt, updatedAt, items, ...rest } = plain;

  const serializedItems = Array.isArray(items)
    ? items.map(item => ({
        id: item._id ? item._id.toString() : undefined,
        kind: item.kind,
        quantity: item.quantity,
        sizes: Array.isArray(item.sizes) ? item.sizes : [],
      }))
    : undefined;

  return {
    id: _id.toString(),
    ...rest,
    items: serializedItems,
    createdAt: toISOString(createdAt),
    updatedAt: toISOString(updatedAt),
  } satisfies UniformDTO;
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

  const normalizedItems = normalizeItems(input.items);

  const created = await UniformModel.create({
    name: input.name.trim(),
    description: input.description?.trim(),
    category: input.category,
    gender: input.gender,
    sizes: deriveLegacySizes(normalizedItems, input.sizes),
    items: normalizedItems ?? [],
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

  if (updates.sizes !== undefined) {
    updateQuery.sizes = updates.sizes;
  }

  if (updates.items !== undefined) {
    const normalizedItems = normalizeItems(updates.items);
    updateQuery.items = normalizedItems ?? [];

    if (updates.sizes === undefined) {
      updateQuery.sizes = deriveLegacySizes(normalizedItems, undefined);
    }
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
