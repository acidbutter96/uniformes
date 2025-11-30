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

function averageCircumference(values: Array<number | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number');
  if (!filtered.length) {
    return undefined;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function suggestSize({ height, weight, chest, waist, hips }: MeasurementsPayload) {
  if (!height || !weight) {
    return 'M';
  }

  const circumference = averageCircumference([chest, waist, hips]) ?? height * 0.6;

  const thresholds = [
    { size: 'PP', height: 155, weight: 50, circumference: 85 },
    { size: 'P', height: 170, weight: 65, circumference: 100 },
    { size: 'M', height: 185, weight: 85, circumference: 115 },
  ];

  for (const threshold of thresholds) {
    if (
      height <= threshold.height ||
      weight <= threshold.weight ||
      circumference <= threshold.circumference
    ) {
      return threshold.size;
    }
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
