'use client';

const STORAGE_KEY = 'uniformes:order-flow';

export type MeasurementsMap = {
  height: number;
  chest: number;
  waist: number;
  hips: number;
};

export interface SuggestionData {
  suggestion: string;
  confidence: number;
  message: string;
}

export interface OrderFlowState {
  childId?: string;
  schoolId?: string;
  supplierId?: string;
  uniformId?: string;
  measurements?: MeasurementsMap;
  suggestion?: SuggestionData;
  selectedSize?: string;
  userName?: string;
  orderId?: string;
  orderCreatedAt?: string;
}

function readState(): OrderFlowState {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as OrderFlowState;
  } catch (error) {
    console.error('Failed to parse order flow state', error);
    return {};
  }
}

function writeState(state: OrderFlowState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadOrderFlowState(): OrderFlowState {
  return readState();
}

export function saveOrderFlowState(partial: Partial<OrderFlowState>): OrderFlowState {
  const current = readState();
  const next = { ...current, ...partial } satisfies OrderFlowState;
  writeState(next);
  return next;
}

export function clearOrderFlowState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
