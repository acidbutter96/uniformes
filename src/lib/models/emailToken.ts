import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type EmailTokenType = 'verify_email' | 'change_email' | 'reset_password';

export interface EmailTokenDocument extends Document {
  userId: Types.ObjectId;
  email: string;
  type: EmailTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTokenSchema = new Schema<EmailTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ['verify_email', 'change_email', 'reset_password'],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, required: false },
  },
  { timestamps: true },
);

// Auto-remove expired tokens
EmailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailTokenModel: Model<EmailTokenDocument> =
  mongoose.models.EmailToken || mongoose.model<EmailTokenDocument>('EmailToken', EmailTokenSchema);

export default EmailTokenModel;
