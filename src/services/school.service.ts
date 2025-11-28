import dbConnect from '@/src/lib/database';
import SchoolModel, { type SchoolDocument, type SchoolStatus } from '@/src/lib/models/school';

export type CreateSchoolInput = {
  name: string;
  city: string;
  students: number;
  status?: SchoolStatus;
};

export type UpdateSchoolInput = Partial<CreateSchoolInput>;

export async function listSchools() {
  await dbConnect();
  return SchoolModel.find().sort({ createdAt: -1 }).lean().exec();
}

export async function createSchool(input: CreateSchoolInput) {
  await dbConnect();
  const document = await SchoolModel.create({
    ...input,
    status: input.status ?? 'ativo',
  });
  return document.toObject();
}

export async function updateSchool(id: string, updates: UpdateSchoolInput) {
  await dbConnect();
  return SchoolModel.findByIdAndUpdate(id, { ...updates }, { new: true, runValidators: true })
    .lean()
    .exec();
}

export async function deleteSchool(id: string) {
  await dbConnect();
  return SchoolModel.findByIdAndDelete(id).lean().exec();
}

export async function getSchoolById(id: string) {
  await dbConnect();
  return SchoolModel.findById(id).lean().exec();
}

export function serializeSchool(document: Partial<SchoolDocument> | null | undefined) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document as Record<string, unknown> & {
    _id?: unknown;
    __v?: unknown;
  };

  if ('__v' in rest) {
    delete (rest as { __v?: unknown }).__v;
  }

  const id =
    typeof _id === 'object' &&
    _id !== null &&
    typeof (_id as { toString?: () => string }).toString === 'function'
      ? (_id as { toString: () => string }).toString()
      : ((_id as string | number | undefined)?.toString() ?? '');

  return { id, ...rest };
}
