import { NextResponse } from 'next/server';

import {
  createReservation,
  listReservations,
} from '@/src/services/reservation.service';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const data = await listReservations();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list reservations', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as reservas.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { userName, schoolId, uniformId, measurements, suggestedSize } = payload as {
      userName?: unknown;
      schoolId?: unknown;
      uniformId?: unknown;
      measurements?: unknown;
      suggestedSize?: unknown;
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

    const created = await createReservation({
      userName,
      schoolId,
      uniformId,
      measurements: parsedMeasurements,
      suggestedSize,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create reservation', error);
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Não foi possível registrar a reserva. Tente novamente.' },
      { status: 500 },
    );
  }
}
