import { createReservation, listReservations } from '@/src/services/reservation.service';
import { badRequest, notFound, ok, serverError } from '@/app/api/utils/responses';
import { RESERVATION_STATUSES, type ReservationStatus } from '@/src/types/reservation';

const VALID_RESERVATION_STATUS = new Set<ReservationStatus>(RESERVATION_STATUSES);

export async function GET() {
  try {
    const data = await listReservations();
    return ok(data);
  } catch (error) {
    console.error('Failed to list reservations', error);
    return serverError('Não foi possível carregar as reservas.');
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { userName, schoolId, uniformId, measurements, suggestedSize, status, value } =
      payload as {
        userName?: unknown;
        schoolId?: unknown;
        uniformId?: unknown;
        measurements?: unknown;
        suggestedSize?: unknown;
        status?: unknown;
        value?: unknown;
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

    if (typeof suggestedSize !== 'string' || !suggestedSize.trim()) {
      return badRequest('Tamanho sugerido é obrigatório.');
    }

    if (typeof measurements !== 'object' || measurements === null) {
      return badRequest('Medidas inválidas.');
    }

    const requiredFields = ['age', 'height', 'weight', 'chest', 'waist', 'hips'] as const;
    const parsedMeasurements: Record<(typeof requiredFields)[number], number> = {
      age: 0,
      height: 0,
      weight: 0,
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
      parsedMeasurements[field] = numeric;
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

    let resolvedValue: number | undefined;
    if (value !== undefined) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return badRequest('Valor da reserva inválido.');
      }
      resolvedValue = numericValue;
    }

    const created = await createReservation({
      userName,
      schoolId,
      uniformId,
      measurements: parsedMeasurements,
      suggestedSize,
      status: resolvedStatus,
      value: resolvedValue,
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

    return serverError('Não foi possível registrar a reserva. Tente novamente.');
  }
}
