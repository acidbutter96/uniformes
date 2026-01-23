import mongoose, { Schema, Types, type Document, type Model } from 'mongoose';

import {
  type ReservationEventType,
  type ReservationStatus,
  RESERVATION_EVENT_TYPES,
  RESERVATION_STATUSES,
} from '@/src/types/reservation';

function buildSystemStatusEvent(status: ReservationStatus) {
  const type: ReservationEventType = status === 'cancelada' ? 'cancelled' : 'status_changed';
  return {
    type,
    at: new Date(),
    status,
    actorRole: 'system',
  };
}

function getStatusFromUpdate(update: unknown): ReservationStatus | null {
  if (!update || typeof update !== 'object') return null;

  // Pipeline updates are not handled here.
  if (Array.isArray(update)) return null;

  const direct = (update as { status?: unknown }).status;
  const setStatus = (update as { $set?: Record<string, unknown> }).$set?.status;
  const next = (direct ?? setStatus) as unknown;

  if (typeof next === 'string' && (RESERVATION_STATUSES as readonly string[]).includes(next)) {
    return next as ReservationStatus;
  }

  return null;
}

function updateAlreadyPushesEvents(update: unknown) {
  if (!update || typeof update !== 'object' || Array.isArray(update)) return false;
  const u = update as {
    $push?: Record<string, unknown>;
    $addToSet?: Record<string, unknown>;
  };

  return Boolean(u.$push?.events) || Boolean(u.$addToSet?.events);
}

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
  events?: Array<{
    type: ReservationEventType;
    at: Date;
    status?: ReservationStatus;
    actorRole?: string;
    actorUserId?: Types.ObjectId;
  }>;
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

const ReservationEventSchema = new Schema<{
  type: ReservationEventType;
  at: Date;
  status?: ReservationStatus;
  actorRole?: string;
  actorUserId?: Types.ObjectId;
}>(
  {
    type: {
      type: String,
      required: true,
      enum: RESERVATION_EVENT_TYPES,
    },
    at: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    status: {
      type: String,
      required: false,
      enum: RESERVATION_STATUSES,
    },
    actorRole: {
      type: String,
      required: false,
      trim: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      required: false,
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
    events: {
      type: [ReservationEventSchema],
      required: false,
      default: undefined,
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

ReservationSchema.pre('save', function reservationStatusAudit() {
  if (this.isNew) return;
  if (!this.isModified('status')) return;

  const status = this.status;
  if (!RESERVATION_STATUSES.includes(status)) return;

  const events = Array.isArray(this.events) ? this.events : [];

  // If caller already appended a status event in the same save, don't add a duplicate.
  if (this.isModified('events') && events.length > 0) {
    const last = events[events.length - 1];
    if (
      last &&
      typeof last === 'object' &&
      (last as { status?: unknown }).status === status &&
      ['status_changed', 'cancelled'].includes(String((last as { type?: unknown }).type ?? ''))
    ) {
      this.events = events;
      return;
    }
  }

  events.push(buildSystemStatusEvent(status));
  this.events = events;
});

ReservationSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function reservationStatusAudit() {
    const update = this.getUpdate();
    const nextStatus = getStatusFromUpdate(update);
    if (!nextStatus) return;

    // If caller already records events, don't duplicate.
    if (updateAlreadyPushesEvents(update)) return;

    // We only support object updates here (not pipelines).
    if (!update || typeof update !== 'object' || Array.isArray(update)) return;

    const mutable = update as Record<string, unknown> & { $push?: Record<string, unknown> };
    const eventPayload = buildSystemStatusEvent(nextStatus);

    if (!mutable.$push) mutable.$push = {};

    const existingPush = mutable.$push.events;
    if (!existingPush) {
      mutable.$push.events = eventPayload;
    } else if (
      typeof existingPush === 'object' &&
      existingPush !== null &&
      '$each' in (existingPush as Record<string, unknown>) &&
      Array.isArray((existingPush as { $each?: unknown }).$each)
    ) {
      (existingPush as { $each: unknown[] }).$each.push(eventPayload);
    }

    this.setUpdate(mutable);
  },
);

ReservationSchema.index({ childId: 1, reservationYear: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development' && mongoose.models.Reservation) {
  delete mongoose.models.Reservation;
}

const ReservationModel: Model<ReservationDocument> =
  mongoose.models.Reservation ||
  mongoose.model<ReservationDocument>('Reservation', ReservationSchema);

export default ReservationModel;
export { RESERVATION_STATUSES };
