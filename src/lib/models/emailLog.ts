import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type EmailLogStatus = 'sent' | 'failed' | 'skipped';

export interface EmailLogDocument extends Document {
  provider: 'smtp';
  status: EmailLogStatus;
  from?: string;
  to: string[];
  subject?: string;
  replyTo?: string;
  messageId?: string;
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
  };
  content?: {
    hasHtml: boolean;
    hasText: boolean;
    htmlLength: number;
    textLength: number;
  };
  reason?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: unknown;
    response?: string;
    responseCode?: number;
    command?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<EmailLogDocument>(
  {
    provider: { type: String, enum: ['smtp'], required: true, default: 'smtp' },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    from: { type: String, required: false },
    to: { type: [String], required: true, default: [] },
    subject: { type: String, required: false },
    replyTo: { type: String, required: false },
    messageId: { type: String, required: false },
    smtp: {
      host: { type: String, required: false },
      port: { type: Number, required: false },
      secure: { type: Boolean, required: false },
    },
    content: {
      hasHtml: { type: Boolean, required: true, default: false },
      hasText: { type: Boolean, required: true, default: false },
      htmlLength: { type: Number, required: true, default: 0 },
      textLength: { type: Number, required: true, default: 0 },
    },
    reason: { type: String, required: false },
    error: {
      name: { type: String, required: false },
      message: { type: String, required: false },
      stack: { type: String, required: false },
      code: { type: Schema.Types.Mixed, required: false },
      response: { type: String, required: false },
      responseCode: { type: Number, required: false },
      command: { type: String, required: false },
    },
  },
  { timestamps: true },
);

EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });

const ttlDays = Number(process.env.EMAIL_LOG_TTL_DAYS ?? 30);
if (Number.isFinite(ttlDays) && ttlDays > 0) {
  EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlDays * 24 * 60 * 60 });
}

const EmailLogModel: Model<EmailLogDocument> =
  mongoose.models.EmailLog || mongoose.model<EmailLogDocument>('EmailLog', EmailLogSchema);

export default EmailLogModel;
