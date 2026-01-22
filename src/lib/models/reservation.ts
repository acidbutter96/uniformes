import mongoose, { Schema, Types, type Document, type Model } from 'mongoose';

import { type ReservationStatus, RESERVATION_STATUSES } from '@/src/types/reservation';

export interface ReservationMeasurements {
  height: number;
  chest: number;
  waist: number;
  hips: number;
}

export interface ReservationDocument extends Document {
  userName: string;
  userId: Types.ObjectId;
  childId: Types.ObjectId;
  schoolId: Types.ObjectId;
  uniformId: Types.ObjectId;
  uniformItemSelections?: { uniform_item_id: Types.ObjectId; size: string }[];
  supplierId?: Types.ObjectId | null;
  measurements?: ReservationMeasurements;
  suggestedSize: string;
  reservationYear: number;
  status: ReservationStatus;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const MeasurementsSchema = new Schema<ReservationMeasurements>(
  {
    height: {
      type: Number,
      min: 50,
      max: 230,
      required: false,
    },
    chest: {
      type: Number,
      min: 30,
      max: 220,
      required: false,
    },
    waist: {
      type: Number,
      min: 30,
      max: 220,
      required: false,
    },
    hips: {
      type: Number,
      min: 30,
      max: 220,
      required: false,
    },
  },
  { _id: false },
);

const UniformItemSelectionSchema = new Schema<{ uniform_item_id: Types.ObjectId; size: string }>(
  {
    uniform_item_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
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
    childId: {
      type: Schema.Types.ObjectId,
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
    uniformItemSelections: {
      type: [UniformItemSelectionSchema],
      required: false,
      default: undefined,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
    },
    measurements: {
      type: MeasurementsSchema,
      required: false,
    },
    suggestedSize: {
      type: String,
      required: true,
      trim: true,
    },
    reservationYear: {
      type: Number,
      required: true,
      min: 1970,
      max: 9999,
      default: () => new Date().getUTCFullYear(),
    },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'aguardando',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

ReservationSchema.index({ childId: 1, reservationYear: 1 }, { unique: true });

const ReservationModel: Model<ReservationDocument> =
  mongoose.models.Reservation ||
  mongoose.model<ReservationDocument>('Reservation', ReservationSchema);

export default ReservationModel;
export { RESERVATION_STATUSES };
