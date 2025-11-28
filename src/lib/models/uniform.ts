import mongoose, { Schema, Types, type Document, type Model } from 'mongoose';

export interface UniformDocument extends Document {
  name: string;
  description?: string;
  supplierId: Types.ObjectId;
  sizes: string[];
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
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    sizes: {
      type: [String],
      default: [],
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
