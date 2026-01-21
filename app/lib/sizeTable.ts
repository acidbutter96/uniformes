export type BrazilianSize = 'PP' | 'P' | 'M' | 'G' | 'GG';

export type Range = readonly [min: number, max: number];

export type SizeChartEntry = {
  size: BrazilianSize;
  height: Range; // cm
  chest: Range; // cm
  waist: Range; // cm
  hips: Range; // cm
};

// Deterministic, realistic-ish ranges for Brazilian youth sizing (up to 17 years).
// Ranges intentionally overlap to support scoring-based recommendation.
export const SIZE_CHART: readonly SizeChartEntry[] = [
  {
    size: 'PP',
    height: [95, 120],
    chest: [52, 64],
    waist: [50, 58],
    hips: [56, 70],
  },
  {
    size: 'P',
    height: [115, 140],
    chest: [62, 74],
    waist: [56, 66],
    hips: [68, 82],
  },
  {
    size: 'M',
    height: [135, 160],
    chest: [72, 86],
    waist: [64, 76],
    hips: [80, 94],
  },
  {
    size: 'G',
    height: [155, 175],
    chest: [84, 98],
    waist: [74, 88],
    hips: [92, 106],
  },
  {
    size: 'GG',
    height: [170, 190],
    chest: [96, 112],
    waist: [86, 104],
    hips: [104, 120],
  },
] as const;
