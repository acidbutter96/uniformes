import { NextRequest } from 'next/server';
import { Types } from 'mongoose';

import { createReservation, listReservations } from '@/src/services/reservation.service';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { RESERVATION_STATUSES, type ReservationStatus } from '@/src/types/reservation';
import { ensureUserAccess } from '@/app/api/utils/user-auth';

const VALID_RESERVATION_STATUS = new Set<ReservationStatus>(RESERVATION_STATUSES);

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope');
    const userIdParam = request.nextUrl.searchParams.get('userId');

    if (scope === 'me') {
      const authResult = ensureUserAccess(request);
      if ('response' in authResult) {
        return authResult.response;
      }

      if (!Types.ObjectId.isValid(authResult.payload.sub)) {
        return badRequest('Usuário inválido.');
      }

      const data = await listReservations({ userId: new Types.ObjectId(authResult.payload.sub) });
      return ok(data);
    }

    if (userIdParam) {
      if (!Types.ObjectId.isValid(userIdParam)) {
        return badRequest('Parâmetro userId inválido.');
      }

      const data = await listReservations({ userId: new Types.ObjectId(userIdParam) });
      return ok(data);
    }

    const data = await listReservations();
    return ok(data);
  } catch (error) {
    console.error('Failed to list reservations', error);
    return serverError('Não foi possível carregar as reservas.');
  }
}

export async function POST(request: NextRequest) {
  const authResult = ensureUserAccess(request);
  try {
    if ('response' in authResult) {
      return authResult.response;
    }
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const {
      userName,
      childId,
      schoolId,
      uniformId,
      supplierId,
      measurements,
      suggestedSize,
      uniformItemSelections,
      status,
    } = payload as {
      userName?: unknown;
      childId?: unknown;
      schoolId?: unknown;
      uniformId?: unknown;
      supplierId?: unknown;
      measurements?: unknown;
      suggestedSize?: unknown;
      uniformItemSelections?: unknown;
      status?: unknown;
    };

    if (typeof userName !== 'string' || !userName.trim()) {
      return badRequest('Nome do usuário é obrigatório.');
    }

    if (typeof schoolId !== 'string' || !schoolId.trim()) {
      return badRequest('Escola é obrigatória.');
    }

    if (typeof uniformId !== 'string' || !uniformId.trim()) {
      return badRequest('Uniforme é obrigatório.');
    }

    if (typeof childId !== 'string' || !childId.trim()) {
      return badRequest('Aluno é obrigatório.');
    }

    if (!Types.ObjectId.isValid(authResult.payload.sub)) {
      return badRequest('Usuário inválido.');
    }

    const userObjectId = new Types.ObjectId(authResult.payload.sub);

    if (typeof suggestedSize !== 'string' || !suggestedSize.trim()) {
      return badRequest('Tamanho sugerido é obrigatório.');
    }

    let parsedUniformItemSelections: Array<{ uniform_item_id: string; size: string }> | undefined;
    if (uniformItemSelections !== undefined && uniformItemSelections !== null) {
      if (!Array.isArray(uniformItemSelections)) {
        return badRequest('Itens selecionados inválidos.');
      }

      const parsed: Array<{ uniform_item_id: string; size: string }> = [];
      for (const entry of uniformItemSelections) {
        if (!entry || typeof entry !== 'object') {
          return badRequest('Itens selecionados inválidos.');
        }

        const uniform_item_id = (entry as Record<string, unknown>).uniform_item_id;
        const size = (entry as Record<string, unknown>).size;

        if (typeof uniform_item_id !== 'string' || !Types.ObjectId.isValid(uniform_item_id)) {
          return badRequest('uniform_item_id inválido.');
        }

        if (typeof size !== 'string' || !size.trim()) {
          return badRequest('Tamanho do item inválido.');
        }

        parsed.push({ uniform_item_id, size: size.trim() });
      }

      parsedUniformItemSelections = parsed.length > 0 ? parsed : undefined;
    }
    let resolvedSupplierId: string | undefined;
    if (supplierId !== undefined && supplierId !== null) {
      if (typeof supplierId !== 'string' || !Types.ObjectId.isValid(supplierId)) {
        return badRequest('Fornecedor inválido.');
      }
      resolvedSupplierId = supplierId as string;
    }

    const requiredFields = ['height', 'chest', 'waist', 'hips'] as const;
    let parsedMeasurements: Record<(typeof requiredFields)[number], number> | undefined;

    if (measurements !== undefined && measurements !== null) {
      if (typeof measurements !== 'object') {
        return badRequest('Medidas inválidas.');
      }

      const parsed: Record<(typeof requiredFields)[number], number> = {
        height: 0,
        chest: 0,
        waist: 0,
        hips: 0,
      };

      for (const field of requiredFields) {
        const value = (measurements as Record<string, unknown>)[field];
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          return badRequest(`Medida ${field} inválida.`);
        }
        parsed[field] = numeric;
      }
    }

    let resolvedStatus: ReservationStatus | undefined;
    if (status !== undefined) {
      if (
        typeof status !== 'string' ||
        !VALID_RESERVATION_STATUS.has(status as ReservationStatus)
      ) {
        return badRequest('Status da reserva inválido.');
      }
      resolvedStatus = status as ReservationStatus;
    }

    const created = await createReservation({
      userName,
      userId: userObjectId.toString(),
      childId,
      schoolId,
      uniformId,
      supplierId: resolvedSupplierId,
      measurements: parsedMeasurements,
      suggestedSize,
      uniformItemSelections: parsedUniformItemSelections,
      status: resolvedStatus,
    });

    return ok(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create reservation', error);
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return notFound(error.message);
    }

    if (error instanceof Error && error.message.includes('inválido')) {
      return badRequest(error.message);
    }

    if (error instanceof Error && error.message.includes('Limite de reservas')) {
      return badRequest(error.message);
    }

    return serverError('Não foi possível registrar a reserva. Tente novamente.');
  }
}
