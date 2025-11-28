import type { FilterQuery, LeanDocument, UpdateQuery } from 'mongoose';

import dbConnect from '@/src/lib/database';
import SchoolModel, {
  type SchoolDocument,
  type SchoolStatus,
} from '@/src/lib/models/school';

export type CreateSchoolInput = {
  name: string;
  city: string;
  students: number;
  status?: SchoolStatus;
};

export type UpdateSchoolInput = Partial<CreateSchoolInput>;

export type SchoolResponse = ReturnType<typeof serializeSchool>;

type SerializableSchool = SchoolDocument | LeanDocument<SchoolDocument>;

export function serializeSchool(doc: SerializableSchool) {
  const { _id, __v, ...rest } = 'toObject' in doc ? doc.toObject() : doc;
  return {
    id: _id.toString(),
    ...rest,
  } as {
    id: string;
    name: string;
    city: string;
    students: number;
    status: SchoolStatus;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

export async function listSchools(filter: FilterQuery<SchoolDocument> = {}) {
  await dbConnect();
  const results = await SchoolModel.find(filter).sort({ name: 1 }).lean().exec();
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
