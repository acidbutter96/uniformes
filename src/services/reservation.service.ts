import { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel, {
  type ReservationDocument,
  type ReservationMeasurements,
} from '@/src/lib/models/reservation';
import SchoolModel from '@/src/lib/models/school';
import UniformModel from '@/src/lib/models/uniform';
import UserModel from '@/src/lib/models/user';
import {
  type ReservationDTO,
  type ReservationStatus,
  RESERVATION_STATUSES,
} from '@/src/types/reservation';

export type CreateReservationInput = {
  userName: string;
  userId: string;
  childId: string;
  schoolId: string;
  uniformId: string;
  supplierId?: string;
  measurements: ReservationMeasurements;
  suggestedSize: string;
  status?: ReservationStatus;
  value?: number;
};

type SerializableReservation = ReservationDocument;
type ReservationFilter = Parameters<(typeof ReservationModel)['find']>[0];

function toISOString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function serializeReservation(doc: SerializableReservation): ReservationDTO {
  const plain = doc.toObject() as ReservationDocument & {
    _id: Types.ObjectId;
    __v?: unknown;
    userId: Types.ObjectId;
    childId: Types.ObjectId;
    schoolId: Types.ObjectId;
    uniformId: Types.ObjectId;
    supplierId?: Types.ObjectId | null;
  };

  const { _id, userId, childId, schoolId, uniformId, createdAt, updatedAt, ...rest } = plain;

  return {
    id: _id.toString(),
    userId: userId.toString(),
    childId: childId.toString(),
    schoolId: schoolId.toString(),
    uniformId: uniformId.toString(),
    supplierId: plain.supplierId ? plain.supplierId.toString() : undefined,
    ...rest,
    createdAt: toISOString(createdAt),
    updatedAt: toISOString(updatedAt),
  } satisfies ReservationDTO;
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

export async function listReservations(filter: ReservationFilter = {}) {
  await dbConnect();
  const results = await ReservationModel.find(filter).sort({ createdAt: -1 }).exec();
  return results.map(serializeReservation);
}

export async function createReservation(input: CreateReservationInput) {
  await dbConnect();
  await ensureReferencesExists(input.schoolId, input.uniformId);

  // Enforce reservation limit by the number of children in the user document
  const user = await UserModel.findById(input.userId).lean().exec();
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  const childrenArray = Array.isArray((user as { children?: { _id?: Types.ObjectId }[] }).children)
    ? ((user as { children?: { _id?: Types.ObjectId }[] }).children ?? [])
    : [];
  const limit = childrenArray.length;
  if (limit <= 0) {
    throw new Error('Usuário não possui crianças cadastradas para realizar reservas.');
  }

  // Ensure the provided childId belongs to this user
  if (!Types.ObjectId.isValid(input.childId)) {
    throw new Error('Criança inválida.');
  }
  const childObjectId = new Types.ObjectId(input.childId);
  const hasChild = childrenArray.some(c => c._id && c._id.equals(childObjectId));
  if (!hasChild) {
    throw new Error('Criança selecionada não pertence a este usuário.');
  }

  const currentCount = await ReservationModel.countDocuments({ userId: input.userId }).exec();
  if (currentCount >= limit) {
    throw new Error('Limite de reservas atingido.');
  }

  // Enforce only one reservation per child
  const existingForChild = await ReservationModel.countDocuments({
    userId: input.userId,
    childId: childObjectId,
  }).exec();
  if (existingForChild > 0) {
    throw new Error('Já existe uma reserva para esta criança.');
  }

  const status = input.status ?? 'aguardando';
  if (!RESERVATION_STATUSES.includes(status)) {
    throw new Error('Status de reserva inválido.');
  }

  const value = input.value ?? 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Valor da reserva inválido.');
  }

  const created = await ReservationModel.create({
    userName: input.userName.trim(),
    userId: new Types.ObjectId(input.userId),
    childId: childObjectId,
    schoolId: new Types.ObjectId(input.schoolId),
    uniformId: new Types.ObjectId(input.uniformId),
    supplierId: input.supplierId ? new Types.ObjectId(input.supplierId) : undefined,
    measurements: input.measurements,
    suggestedSize: input.suggestedSize.trim(),
    status,
    value,
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
