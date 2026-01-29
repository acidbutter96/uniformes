import 'server-only';

import { createHash, randomBytes } from 'crypto';

import dbConnect from '@/src/lib/database';
import EmailTokenModel, { type EmailTokenType } from '@/src/lib/models/emailToken';

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

export function getAppBaseUrl() {
  const raw = (process.env.NEXT_APP_URL || process.env.NEXT_PUBLIC_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

function getTokenTtlMinutes(type: EmailTokenType) {
  const raw =
    type === 'verify_email'
      ? process.env.EMAIL_VERIFY_TOKEN_TTL_MINUTES
      : process.env.EMAIL_CHANGE_TOKEN_TTL_MINUTES;

  const minutes = Number(raw ?? 60);
  if (!Number.isFinite(minutes) || minutes <= 0) return 60;
  return minutes;
}

export async function createEmailToken(params: {
  userId: string;
  email: string;
  type: EmailTokenType;
}) {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(rawToken);

  const ttlMinutes = getTokenTtlMinutes(params.type);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await dbConnect();

  const doc = await EmailTokenModel.create({
    userId: params.userId,
    email: params.email.toLowerCase().trim(),
    type: params.type,
    tokenHash,
    expiresAt,
  });

  return { rawToken, doc };
}

export async function consumeEmailToken(params: { token: string; type: EmailTokenType }) {
  const token = params.token?.trim();
  if (!token) throw new Error('Token é obrigatório.');

  const tokenHash = sha256Hex(token);

  await dbConnect();

  const doc = await EmailTokenModel.findOne({ tokenHash, type: params.type }).exec();
  if (!doc) {
    throw new Error('Token inválido ou não encontrado.');
  }

  if (doc.usedAt) {
    throw new Error('Este token já foi utilizado.');
  }

  if (doc.expiresAt.getTime() < Date.now()) {
    throw new Error('Este token expirou.');
  }

  doc.usedAt = new Date();
  await doc.save();

  return doc;
}
