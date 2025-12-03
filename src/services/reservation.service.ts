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
    schoolId: Types.ObjectId;
    uniformId: Types.ObjectId;
    supplierId?: Types.ObjectId | null;
  };

  const { _id, userId, schoolId, uniformId, createdAt, updatedAt, ...rest } = plain;

  return {
    id: _id.toString(),
    userId: userId.toString(),
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

  // Enforce reservation limit by user's childrenCount
  const user = await UserModel.findById(input.userId).lean().exec();
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  const limit = Number(user.childrenCount ?? 0);
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error('Configuração de usuário inválida.');
  }
  const currentCount = await ReservationModel.countDocuments({ userId: input.userId }).exec();
  if (currentCount >= limit) {
    throw new Error('Limite de reservas atingido.');
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
