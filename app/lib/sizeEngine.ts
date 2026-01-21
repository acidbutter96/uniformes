import { SIZE_CHART, type BrazilianSize, type Range, type SizeChartEntry } from './sizeTable';
import type { MeasurementsData } from '@/app/lib/measurements';

export type RecommendedSize = BrazilianSize | 'MANUAL';

export type RecommendSizeResult = {
  size: RecommendedSize;
  score: number;
};

const WEIGHTS = {
  chest: 4,
  height: 3,
  waist: 2,
  hips: 2,
} as const;

export const MAX_SCORE = WEIGHTS.chest + WEIGHTS.height + WEIGHTS.waist + WEIGHTS.hips;

const OUTSIDE_TOLERANCE_RATIO = 0.05;
const PARTIAL_RATIO = 0.5;

export const MIN_SCORE_THRESHOLD = 6;

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

function scoreSize(entry: SizeChartEntry, m: MeasurementsData): number {
  // Only height/chest/waist/hips are used (age is intentionally ignored).
  return (
    scoreRange(m.chest, entry.chest, WEIGHTS.chest) +
    scoreRange(m.height, entry.height, WEIGHTS.height) +
    scoreRange(m.waist, entry.waist, WEIGHTS.waist) +
    scoreRange(m.hips, entry.hips, WEIGHTS.hips)
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
