import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface UserAddress {
  cep: string;
  street: string;
  number?: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export type UserRole = 'user' | 'admin' | 'supplier';

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  provider: 'credentials' | 'google';
  verified: boolean;
  supplierId?: Types.ObjectId | null;
  cpf?: string;
  birthDate?: Date;
  address?: UserAddress;
  children?: Array<{
    name: string;
    age: number;
    schoolId: Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'supplier'],
      default: 'user',
    },
    provider: {
      type: String,
      enum: ['credentials', 'google'],
      default: 'credentials',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
    },
    cpf: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    birthDate: {
      type: Date,
    },
    address: {
      cep: { type: String, trim: true },
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      complement: { type: String, trim: true },
      district: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
    childrenCount: {
      type: Number,
      min: 0,
      default: 0,
      immutable(this: UserDocument) {
        return this.verified === true;
      },
    },
    children: [
      new Schema(
        {
          name: { type: String, required: true, trim: true },
          age: { type: Number, required: true, min: 0 },
          schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

UserSchema.index(
  { cpf: 1 },
  { unique: true, partialFilterExpression: { cpf: { $type: 'string' } } },
);

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
