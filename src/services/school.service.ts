import type { UpdateQuery } from 'mongoose';
import { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SchoolModel, { type SchoolDocument, type SchoolStatus } from '@/src/lib/models/school';
import type { SchoolDTO } from '@/src/types/school';

export type CreateSchoolInput = {
  name: string;
  city: string;
  students: number;
  status?: SchoolStatus;
};

export type UpdateSchoolInput = Partial<CreateSchoolInput>;

export type SchoolResponse = SchoolDTO;

type SerializableSchool = SchoolDocument;
type SchoolFilter = Parameters<(typeof SchoolModel)['find']>[0];

function toISOString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function serializeSchool(doc: SerializableSchool): SchoolDTO {
  const plain = doc.toObject() as SchoolDocument & {
    _id: Types.ObjectId;
    __v?: unknown;
  };

  const { _id, createdAt, updatedAt, ...rest } = plain;

  return {
    id: _id.toString(),
    ...rest,
    createdAt: toISOString(createdAt),
    updatedAt: toISOString(updatedAt),
  } satisfies SchoolDTO;
}

export async function listSchools(filter: SchoolFilter = {}) {
  await dbConnect();
  const results = await SchoolModel.find(filter).sort({ name: 1 }).exec();
  return results.map(serializeSchool);
}

export async function getSchoolById(id: string) {
  await dbConnect();
  const result = await SchoolModel.findById(id).exec();
  return result ? serializeSchool(result) : null;
}

export async function createSchool(payload: CreateSchoolInput) {
  await dbConnect();
  const created = await SchoolModel.create({
    name: payload.name.trim(),
    city: payload.city.trim(),
    students: payload.students,
    status: payload.status ?? 'ativo',
  });
  return serializeSchool(created);
}

export async function updateSchool(id: string, updates: UpdateSchoolInput) {
  await dbConnect();
  const updateQuery: UpdateQuery<SchoolDocument> = {};

  if (updates.name !== undefined) {
    updateQuery.name = updates.name.trim();
  }

  if (updates.city !== undefined) {
    updateQuery.city = updates.city.trim();
  }

  if (updates.students !== undefined) {
    updateQuery.students = updates.students;
  }

  if (updates.status !== undefined) {
    updateQuery.status = updates.status;
  }

  const updated = await SchoolModel.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
  }).exec();

  return updated ? serializeSchool(updated) : null;
}

export async function deleteSchool(id: string) {
  await dbConnect();
  const deleted = await SchoolModel.findByIdAndDelete(id).exec();
  return deleted ? serializeSchool(deleted) : null;
}
