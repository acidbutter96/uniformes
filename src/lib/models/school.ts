import mongoose, { Schema, type Document, type Model } from 'mongoose';

export const SCHOOL_STATUSES = ['ativo', 'pendente', 'inativo'] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export interface SchoolDocument extends Document {
  name: string;
  city: string;
  students: number;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<SchoolDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    students: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: SCHOOL_STATUSES,
      default: 'ativo',
    },
  },
  { timestamps: true },
);

const SchoolModel: Model<SchoolDocument> =
  mongoose.models.School || mongoose.model<SchoolDocument>('School', SchoolSchema);

export default SchoolModel;
