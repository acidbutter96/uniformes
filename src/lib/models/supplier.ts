import mongoose, { Schema, Types, type Document, type Model } from 'mongoose';

export interface SupplierDocument extends Document {
  name: string;
  cnpj?: string;
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
  schoolIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<SupplierDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cnpj: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    specialty: {
      type: String,
      trim: true,
    },
    leadTimeDays: {
      type: Number,
      min: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    schoolIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: false,
      },
    ],
  },
  { timestamps: true },
);

const SupplierModel: Model<SupplierDocument> =
  mongoose.models.Supplier || mongoose.model<SupplierDocument>('Supplier', SupplierSchema);

export default SupplierModel;
