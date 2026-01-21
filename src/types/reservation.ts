export type ReservationMeasurementsDTO = {
  age: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
};

export const RESERVATION_STATUSES = ['em-producao', 'enviado', 'aguardando'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type ReservationDTO = {
  id: string;
  userName: string;
  userId: string;
  childId: string;
  schoolId: string;
  uniformId: string;
  measurements?: ReservationMeasurementsDTO;
  suggestedSize: string;
  status: ReservationStatus;
  value: number;
  createdAt: string;
  updatedAt: string;
};
