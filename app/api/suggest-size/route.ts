import { NextResponse } from 'next/server';

import { MAX_SCORE, recommendSize } from '@/app/lib/sizeEngine';

type MeasurementsPayload = {
  height?: number;
  chest?: number;
  waist?: number;
  hips?: number;
};

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as MeasurementsPayload;

    const normalized: MeasurementsPayload = {
      height: sanitizeNumber(payload.height),
      chest: sanitizeNumber(payload.chest),
      waist: sanitizeNumber(payload.waist),
      hips: sanitizeNumber(payload.hips),
    };

    if (!normalized.height || !normalized.chest || !normalized.waist || !normalized.hips) {
      return NextResponse.json(
        {
          error: 'Altura, tórax, cintura e quadril são obrigatórios para gerar a sugestão.',
        },
        { status: 422 },
      );
    }

    const { size, score } = recommendSize({
      height: normalized.height,
      chest: normalized.chest,
      waist: normalized.waist,
      hips: normalized.hips,
    });

    const message =
      size === 'MANUAL'
        ? 'Ajuste manual recomendado para maior precisão.'
        : 'Sugestão calculada com base nas medidas informadas.';

    return NextResponse.json({
      size,
      score,
      maxScore: MAX_SCORE,
      confidence: MAX_SCORE > 0 ? score / MAX_SCORE : 0,
      message,
    });
  } catch (error) {
    console.error('Failed to generate suggestion', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar uma sugestão no momento.' },
      { status: 500 },
    );
  }
}
