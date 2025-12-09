import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface AppSettingsDocument extends Document {
  maxChildrenPerUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<AppSettingsDocument>(
  {
    maxChildrenPerUser: {
      type: Number,
      min: 1,
      default: 7,
    },
  },
  { timestamps: true },
);

const AppSettingsModel: Model<AppSettingsDocument> =
  mongoose.models.AppSettings ||
  mongoose.model<AppSettingsDocument>('AppSettings', AppSettingsSchema);

export default AppSettingsModel;
