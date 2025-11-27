import { NextResponse } from 'next/server';

interface MeasurementsPayload {
  age?: number;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
}

function sanitizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function suggestSize({ height, weight, chest, waist, hips }: MeasurementsPayload) {
  if (!height || !weight) {
    return 'M';
  }

  if (height < 120 || weight < 25 || (chest ?? 0) < 55) {
    return 'PP';
  }

  if (height < 140 || weight < 40 || (hips ?? 0) < 70) {
    return 'P';
  }

  if (height < 160 || weight < 55 || (waist ?? 0) < 80) {
    return 'M';
  }

  return 'G';
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MeasurementsPayload;

    const normalized: MeasurementsPayload = {
      age: sanitizeNumber(payload.age),
      height: sanitizeNumber(payload.height),
      weight: sanitizeNumber(payload.weight),
      chest: sanitizeNumber(payload.chest),
      waist: sanitizeNumber(payload.waist),
      hips: sanitizeNumber(payload.hips),
    };

    if (!normalized.height || !normalized.weight) {
      return NextResponse.json(
        { error: 'Altura e peso são obrigatórios para gerar a sugestão.' },
        { status: 422 },
      );
    }

    const suggestion = suggestSize(normalized);

    const confidence = Math.min(
      1,
      [normalized.chest, normalized.waist, normalized.hips].filter(Boolean).length / 3 + 0.4,
    );

    return NextResponse.json({
      suggestion,
      confidence,
      message: `Recomendamos o tamanho ${suggestion}.`,
    });
  } catch (error) {
    console.error('Failed to generate suggestion', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar uma sugestão no momento.' },
      { status: 500 },
    );
  }
}
