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

export const RESERVATION_EVENT_TYPES = ['created', 'status_changed', 'cancelled'] as const;
export type ReservationEventType = (typeof RESERVATION_EVENT_TYPES)[number];

export type ReservationEventDTO = {
  type: ReservationEventType;
  at: string;
  status?: ReservationStatus;
  actorRole?: 'user' | 'supplier' | 'admin' | 'system' | (string & {});
  actorUserId?: string;
};

export type ReservationDTO = {
  id: string;
  userName: string;
  userId: string;
  childId: string;
  childName?: string;
  schoolId: string;
  uniformId: string;
  uniformItemSelections?: { uniform_item_id: string; size: string }[];
  measurements?: ReservationMeasurementsDTO;
  suggestedSize: string;
  status: ReservationStatus;
  events?: ReservationEventDTO[];
  value: number;
  createdAt: string;
  updatedAt: string;
};
