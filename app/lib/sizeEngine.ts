import { SIZE_CHART, type BrazilianSize, type Range, type SizeChartEntry } from './sizeTable';
import {
  PANTS_SIZE_CHART,
  PANTS_SIZES,
  type PantsSize,
  type PantsSizeChartEntry,
} from './pantsSizeTable';
import type { MeasurementsData } from '@/app/lib/measurements';

export type RecommendedSize = BrazilianSize | 'MANUAL';

export type RecommendSizeResult = {
  size: RecommendedSize;
  score: number;
};

export type RecommendedPantsSize = PantsSize | 'MANUAL';

export type RecommendPantsSizeResult = {
  size: RecommendedPantsSize;
  score: number;
};

const WEIGHTS = {
  chest: 4,
  height: 3,
  waist: 2,
  hips: 2,
} as const;

export const MAX_SCORE = WEIGHTS.chest + WEIGHTS.height + WEIGHTS.waist + WEIGHTS.hips;

const PANTS_WEIGHTS = {
  height: 3,
  waist: 3,
  hips: 2,
} as const;

export const MAX_PANTS_SCORE = PANTS_WEIGHTS.height + PANTS_WEIGHTS.waist + PANTS_WEIGHTS.hips;

const OUTSIDE_TOLERANCE_RATIO = 0.05;
const PARTIAL_RATIO = 0.5;

export const MIN_SCORE_THRESHOLD = 6;

export const MIN_PANTS_SCORE_THRESHOLD = 4;

function scoreRange(value: number, [min, max]: Range, weight: number): number {
  if (value >= min && value <= max) {
    return weight;
  }

  const lowerTolerance = min * (1 - OUTSIDE_TOLERANCE_RATIO);
  const upperTolerance = max * (1 + OUTSIDE_TOLERANCE_RATIO);

  const isSlightlyBelow = value >= lowerTolerance && value < min;
  const isSlightlyAbove = value > max && value <= upperTolerance;

  if (isSlightlyBelow || isSlightlyAbove) {
    return weight * PARTIAL_RATIO;
  }

  return 0;
}

function isPantsSize(value: string): value is PantsSize {
  return (PANTS_SIZES as readonly string[]).includes(value);
}

export function pickAvailablePantsSize(
  available: string[] | undefined,
  recommended: PantsSize,
): PantsSize {
  const normalized = Array.isArray(available)
    ? available.map(v => String(v).trim()).filter(isPantsSize)
    : [];

  const options = normalized.length > 0 ? normalized : [...PANTS_SIZES];

  if (options.includes(recommended)) {
    return recommended;
  }

  const recommendedNumeric = Number(recommended);
  let best = options[0];
  let bestDistance = Math.abs(Number(best) - recommendedNumeric);

  for (const candidate of options) {
    const distance = Math.abs(Number(candidate) - recommendedNumeric);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function scoreSize(entry: SizeChartEntry, m: MeasurementsData): number {
  // Only height/chest/waist/hips are used (age is intentionally ignored).
  return (
    scoreRange(m.chest, entry.chest, WEIGHTS.chest) +
    scoreRange(m.height, entry.height, WEIGHTS.height) +
    scoreRange(m.waist, entry.waist, WEIGHTS.waist) +
    scoreRange(m.hips, entry.hips, WEIGHTS.hips)
  );
}

function scorePantsSize(
  entry: PantsSizeChartEntry,
  m: Pick<MeasurementsData, 'height' | 'waist' | 'hips'>,
): number {
  return (
    scoreRange(m.height, entry.height, PANTS_WEIGHTS.height) +
    scoreRange(m.waist, entry.waist, PANTS_WEIGHTS.waist) +
    scoreRange(m.hips, entry.hips, PANTS_WEIGHTS.hips)
  );
}

export function recommendSize(measurements: MeasurementsData): RecommendSizeResult {
  let best: { size: BrazilianSize; score: number } | null = null;

  for (const entry of SIZE_CHART) {
    const score = scoreSize(entry, measurements);

    if (!best || score > best.score) {
      best = { size: entry.size, score };
      continue;
    }

    // Tie-breaker: keep earlier SIZE_CHART entry (deterministic).
  }

  if (!best || best.score < MIN_SCORE_THRESHOLD) {
    return { size: 'MANUAL', score: best?.score ?? 0 };
  }

  return best;
}

export function recommendPantsSize(
  measurements: Pick<MeasurementsData, 'height' | 'waist' | 'hips'>,
): RecommendPantsSizeResult {
  let best: { size: PantsSize; score: number } | null = null;

  for (const entry of PANTS_SIZE_CHART) {
    const score = scorePantsSize(entry, measurements);

    if (!best || score > best.score) {
      best = { size: entry.size, score };
      continue;
    }
  }

  if (!best || best.score < MIN_PANTS_SCORE_THRESHOLD) {
    return { size: 'MANUAL', score: best?.score ?? 0 };
  }

  return best;
}
