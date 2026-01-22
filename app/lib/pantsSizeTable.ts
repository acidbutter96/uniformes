export const PANTS_SIZES = ['2', '4', '6', '8', '10', '12', '14'] as const;
export type PantsSize = (typeof PANTS_SIZES)[number];

export type Range = readonly [min: number, max: number];

export type PantsSizeChartEntry = {
  size: PantsSize;
  height: Range; // cm
  waist: Range; // cm
  hips: Range; // cm
};

// Deterministic, realistic-ish ranges for Brazilian youth pants sizing.
// Ranges intentionally overlap to support scoring-based recommendation.
export const PANTS_SIZE_CHART: readonly PantsSizeChartEntry[] = [
  {
    size: '2',
    height: [85, 98],
    waist: [44, 52],
    hips: [50, 58],
  },
  {
    size: '4',
    height: [95, 108],
    waist: [48, 56],
    hips: [54, 64],
  },
  {
    size: '6',
    height: [105, 118],
    waist: [52, 60],
    hips: [60, 72],
  },
  {
    size: '8',
    height: [115, 130],
    waist: [56, 66],
    hips: [68, 80],
  },
  {
    size: '10',
    height: [125, 145],
    waist: [60, 72],
    hips: [76, 90],
  },
  {
    size: '12',
    height: [140, 160],
    waist: [64, 78],
    hips: [86, 100],
  },
  {
    size: '14',
    height: [150, 172],
    waist: [70, 86],
    hips: [96, 112],
  },
] as const;
