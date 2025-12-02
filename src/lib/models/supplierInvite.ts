import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface SupplierInviteDocument extends Document {
  token: string;
  supplierId: Types.ObjectId | null;
  email?: string;
  role: 'supplier';
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierInviteSchema = new Schema<SupplierInviteDocument>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['supplier'],
      default: 'supplier',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

SupplierInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SupplierInviteModel: Model<SupplierInviteDocument> =
  mongoose.models.SupplierInvite ||
  mongoose.model<SupplierInviteDocument>('SupplierInvite', SupplierInviteSchema);

export default SupplierInviteModel;
