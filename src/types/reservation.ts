export type ReservationMeasurementsDTO = {
  age: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
};

export type ReservationDTO = {
  id: string;
  userName: string;
  schoolId: string;
  uniformId: string;
  measurements: ReservationMeasurementsDTO;
  suggestedSize: string;
  createdAt: string;
  updatedAt: string;
};
