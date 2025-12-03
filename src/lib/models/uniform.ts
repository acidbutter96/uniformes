import mongoose, { Schema, type Document, type Model } from 'mongoose';

import {
  type UniformCategory,
  type UniformGender,
  UNIFORM_CATEGORIES,
  UNIFORM_GENDERS,
} from '@/src/types/uniform';

export interface UniformDocument extends Document {
  name: string;
  description?: string;
  category: UniformCategory;
  gender: UniformGender;
  sizes: string[];
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UniformSchema = new Schema<UniformDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: UNIFORM_CATEGORIES,
      required: true,
    },
    gender: {
      type: String,
      enum: UNIFORM_GENDERS,
      required: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    imageSrc: {
      type: String,
      trim: true,
    },
    imageAlt: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const UniformModel: Model<UniformDocument> =
  mongoose.models.Uniform || mongoose.model<UniformDocument>('Uniform', UniformSchema);

export default UniformModel;
export { UNIFORM_CATEGORIES, UNIFORM_GENDERS };
