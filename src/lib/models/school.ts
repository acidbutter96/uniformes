import mongoose, { Schema, type Document, type Model } from 'mongoose';

import { SCHOOL_STATUSES, type SchoolStatus } from '@/src/types/school';

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
export { SCHOOL_STATUSES };
export type { SchoolStatus };
