import mongoose, { Schema, Types, type Document, type Model } from 'mongoose';

import { type ReservationStatus, RESERVATION_STATUSES } from '@/src/types/reservation';

export interface ReservationMeasurements {
  age: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
}

export interface ReservationDocument extends Document {
  userName: string;
  userId: Types.ObjectId;
  schoolId: Types.ObjectId;
  uniformId: Types.ObjectId;
  supplierId?: Types.ObjectId | null;
  measurements: ReservationMeasurements;
  suggestedSize: string;
  status: ReservationStatus;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const MeasurementsSchema = new Schema<ReservationMeasurements>(
  {
    age: {
      type: Number,
      min: 1,
      max: 120,
      required: true,
    },
    height: {
      type: Number,
      min: 50,
      max: 230,
      required: true,
    },
    weight: {
      type: Number,
      min: 10,
      max: 250,
      required: true,
    },
    chest: {
      type: Number,
      min: 30,
      max: 220,
      required: true,
    },
    waist: {
      type: Number,
      min: 30,
      max: 220,
      required: true,
    },
    hips: {
      type: Number,
      min: 30,
      max: 220,
      required: true,
    },
  },
  { _id: false },
);

const ReservationSchema = new Schema<ReservationDocument>(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    uniformId: {
      type: Schema.Types.ObjectId,
      ref: 'Uniform',
      required: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
    },
    measurements: {
      type: MeasurementsSchema,
      required: true,
    },
    suggestedSize: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'aguardando',
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const ReservationModel: Model<ReservationDocument> =
  mongoose.models.Reservation ||
  mongoose.model<ReservationDocument>('Reservation', ReservationSchema);

export default ReservationModel;
export { RESERVATION_STATUSES };
