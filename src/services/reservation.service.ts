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
  uniformItemSelections?: { uniform_item_id: string; size: string }[];
  supplierId?: string;
  measurements?: ReservationMeasurements;
  suggestedSize: string;
  status?: ReservationStatus;
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
    uniformItemSelections?: Array<{ uniform_item_id: Types.ObjectId; size: string }>;
    value?: unknown;
  };

  const {
    _id,
    userId,
    childId,
    schoolId,
    uniformId,
    uniformItemSelections,
    value,
    createdAt,
    updatedAt,
    ...rest
  } = plain;

  const resolvedValue = Number(value ?? 0);

  const candidateStatus =
    typeof (plain as unknown as { status?: unknown }).status === 'string'
      ? ((plain as unknown as { status?: string }).status as string)
      : 'aguardando';
  const status = RESERVATION_STATUSES.includes(candidateStatus as ReservationStatus)
    ? (candidateStatus as ReservationStatus)
    : 'aguardando';

  return {
    id: _id.toString(),
    userId: userId.toString(),
    childId: childId.toString(),
    schoolId: schoolId.toString(),
    uniformId: uniformId.toString(),
    supplierId: plain.supplierId ? plain.supplierId.toString() : undefined,
    uniformItemSelections: Array.isArray(uniformItemSelections)
      ? uniformItemSelections.map(entry => ({
          uniform_item_id: entry.uniform_item_id.toString(),
          size: String(entry.size),
        }))
      : undefined,
    value: Number.isFinite(resolvedValue) && resolvedValue >= 0 ? resolvedValue : 0,
    ...rest,
    status,
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

  const uniformForPrice = await UniformModel.findById(input.uniformId)
    .select({ price: 1 })
    .lean<{ price: number }>()
    .exec();

  if (!uniformForPrice) {
    throw new Error('Uniforme não encontrado.');
  }

  const uniformPrice = Number(uniformForPrice.price ?? 0);
  if (!Number.isFinite(uniformPrice) || uniformPrice < 0) {
    throw new Error('Preço do uniforme inválido.');
  }

  if (input.uniformItemSelections && input.uniformItemSelections.length > 0) {
    type UniformLean = { items?: Array<{ _id?: Types.ObjectId }> };
    const uniform = await UniformModel.findById(input.uniformId)
      .select({ items: 1 })
      .lean<UniformLean>()
      .exec();
    if (!uniform) {
      throw new Error('Uniforme não encontrado.');
    }

    const uniformItems = Array.isArray(uniform?.items) ? uniform.items : [];

    const expectedIds = new Set(
      uniformItems.map(item => (item._id ? item._id.toString() : null)).filter(Boolean) as string[],
    );

    const providedIds = new Set(
      input.uniformItemSelections.map(entry => String(entry.uniform_item_id)),
    );

    if (expectedIds.size > 0) {
      for (const id of providedIds) {
        if (!expectedIds.has(id)) {
          throw new Error('Itens selecionados não pertencem ao uniforme informado.');
        }
      }

      if (expectedIds.size !== providedIds.size) {
        throw new Error('Selecione um tamanho para cada item do uniforme.');
      }
    }
  }

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
  const reservationYear = new Date().getUTCFullYear();
  const existingForChildYear = await ReservationModel.countDocuments({
    childId: childObjectId,
    reservationYear,
  }).exec();
  if (existingForChildYear > 0) {
    throw new Error('Já existe uma reserva para esta criança neste ano.');
  }

  const status = input.status ?? 'aguardando';
  if (!RESERVATION_STATUSES.includes(status)) {
    throw new Error('Status de reserva inválido.');
  }

  const reservationPayload: Record<string, unknown> = {
    userName: input.userName.trim(),
    userId: new Types.ObjectId(input.userId),
    childId: childObjectId,
    schoolId: new Types.ObjectId(input.schoolId),
    uniformId: new Types.ObjectId(input.uniformId),
    supplierId: input.supplierId ? new Types.ObjectId(input.supplierId) : undefined,
    suggestedSize: input.suggestedSize.trim(),
    reservationYear,
    status,
    value: uniformPrice,
  };

  if (input.uniformItemSelections && input.uniformItemSelections.length > 0) {
    reservationPayload.uniformItemSelections = input.uniformItemSelections.map(entry => ({
      uniform_item_id: new Types.ObjectId(entry.uniform_item_id),
      size: String(entry.size).trim(),
    }));
  }

  if (input.measurements) {
    reservationPayload.measurements = input.measurements;
  }

  const created = await ReservationModel.create(reservationPayload);

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
