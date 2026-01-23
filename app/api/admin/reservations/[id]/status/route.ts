import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import UserModel from '@/src/lib/models/user';
import { verifyAccessToken } from '@/src/services/auth.service';
import { serializeReservation } from '@/src/services/reservation.service';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/app/api/utils/responses';
import type { ReservationStatus } from '@/src/types/reservation';

type TokenPayload = {
  role?: string;
  sub?: string;
};

type ParamsPromise = Promise<Record<string, string | string[] | undefined>>;

async function resolveReservationId(paramsPromise: ParamsPromise) {
  let params: Record<string, string | string[] | undefined>;
  try {
    params = await paramsPromise;
  } catch (error) {
    console.error('Failed to resolve reservation params', error);
    return undefined;
  }

  const id = params?.id;
  if (!id) {
    return undefined;
  }

  return Array.isArray(id) ? id[0] : id;
}

const SUPPLIER_ALLOWED_STATUSES = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
  'entregue',
  'cancelada',
] as const satisfies readonly ReservationStatus[];

const VALID_SUPPLIER_STATUS = new Set<ReservationStatus>(SUPPLIER_ALLOWED_STATUSES);

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return unauthorized();
    }

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken<TokenPayload>(token);
    } catch (error) {
      console.error('Reservation status auth failed', error);
      return unauthorized();
    }

    if (!payload?.sub) {
      return unauthorized();
    }

    const id = await resolveReservationId(params);
    if (!id || !Types.ObjectId.isValid(id)) {
      return badRequest('Reserva inválida.');
    }

    const body = await request.json().catch(() => null);
    const nextStatus =
      body && typeof body === 'object' ? (body as { status?: unknown }).status : undefined;

    if (typeof nextStatus !== 'string' || !nextStatus.trim()) {
      return badRequest('Status inválido.');
    }

    const status = nextStatus.trim() as ReservationStatus;

    if (payload.role !== 'admin' && payload.role !== 'supplier') {
      return forbidden();
    }

    if (!VALID_SUPPLIER_STATUS.has(status)) {
      return badRequest('Status da reserva inválido.');
    }

    await dbConnect();

    if (payload.role === 'supplier') {
      if (!Types.ObjectId.isValid(payload.sub)) {
        return unauthorized();
      }

      const user = await UserModel.findById(payload.sub).select({ supplierId: 1 }).lean().exec();
      const supplierId =
        user && typeof user === 'object' && 'supplierId' in user
          ? ((user as { supplierId?: Types.ObjectId | null }).supplierId ?? null)
          : null;

      if (!supplierId) {
        return forbidden();
      }

      const updated = await ReservationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), supplierId },
        { $set: { status } },
        { new: true },
      ).exec();

      if (!updated) {
        return notFound('Reserva não encontrada.');
      }

      return ok(serializeReservation(updated));
    }

    const updated = await ReservationModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    ).exec();

    if (!updated) {
      return notFound('Reserva não encontrada.');
    }

    return ok(serializeReservation(updated));
  } catch (error) {
    console.error('Failed to update reservation status', error);
    return serverError('Não foi possível atualizar o status.');
  }
}
