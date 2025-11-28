import { Types, type FilterQuery, type LeanDocument } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel, {
  type ReservationDocument,
  type ReservationMeasurements,
} from '@/src/lib/models/reservation';
import SchoolModel from '@/src/lib/models/school';
import UniformModel from '@/src/lib/models/uniform';

export type CreateReservationInput = {
  userName: string;
  schoolId: string;
  uniformId: string;
  measurements: ReservationMeasurements;
  suggestedSize: string;
};

type SerializableReservation = ReservationDocument | LeanDocument<ReservationDocument>;

export function serializeReservation(doc: SerializableReservation) {
  const { _id, __v, schoolId, uniformId, ...rest } = 'toObject' in doc ? doc.toObject() : doc;

  return {
    id: _id.toString(),
    schoolId: schoolId.toString(),
    uniformId: uniformId.toString(),
    ...rest,
  } as {
    id: string;
    userName: string;
    schoolId: string;
    uniformId: string;
    measurements: ReservationMeasurements;
    suggestedSize: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

async function ensureReferencesExists(schoolId: string, uniformId: string) {
  const schoolExists = await SchoolModel.exists({ _id: schoolId }).exec();
  if (!schoolExists) {
    throw new Error('Escola não encontrada.');
  }

  const uniformExists = await UniformModel.exists({ _id: uniformId }).exec();
  if (!uniformExists) {
    throw new Error('Uniforme não encontrado.');
  }
}

export async function listReservations(filter: FilterQuery<ReservationDocument> = {}) {
  await dbConnect();
  const results = await ReservationModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  return results.map(serializeReservation);
}

export async function createReservation(input: CreateReservationInput) {
  await dbConnect();
  await ensureReferencesExists(input.schoolId, input.uniformId);

  const created = await ReservationModel.create({
    userName: input.userName.trim(),
    schoolId: new Types.ObjectId(input.schoolId),
    uniformId: new Types.ObjectId(input.uniformId),
    measurements: input.measurements,
    suggestedSize: input.suggestedSize.trim(),
  });

  return serializeReservation(created);
}

export async function getReservationById(id: string) {
  await dbConnect();
  const result = await ReservationModel.findById(id).exec();
  return result ? serializeReservation(result) : null;
}

export async function deleteReservation(id: string) {
  await dbConnect();
  const deleted = await ReservationModel.findByIdAndDelete(id).exec();
  return deleted ? serializeReservation(deleted) : null;
}

export { serializeReservation };
