export type ReservationMeasurementsDTO = {
  height: number;
  chest: number;
  waist: number;
  hips: number;
};

// Prefer the supplier workflow statuses. Legacy statuses are kept for backward compatibility.
export const RESERVATION_STATUSES = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
  'entregue',
  'cancelada',
  // legacy
  'em-producao',
  'enviado',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type ReservationDTO = {
  id: string;
  userName: string;
  userId: string;
  childId: string;
  schoolId: string;
  uniformId: string;
  uniformItemSelections?: { uniform_item_id: string; size: string }[];
  measurements?: ReservationMeasurementsDTO;
  suggestedSize: string;
  status: ReservationStatus;
  value: number;
  createdAt: string;
  updatedAt: string;
};
