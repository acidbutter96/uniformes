import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface PreRegistrationDocument extends Document {
  email: string;
  childName: string;
  schoolId: string;
  schoolName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PreRegistrationSchema = new Schema<PreRegistrationDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    childName: {
      type: String,
      required: true,
      trim: true,
    },
    schoolId: {
      type: String,
      required: true,
      trim: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const PreRegistrationModel: Model<PreRegistrationDocument> =
  mongoose.models.PreRegistration ||
  mongoose.model<PreRegistrationDocument>('PreRegistration', PreRegistrationSchema);

export default PreRegistrationModel;
