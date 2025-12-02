import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { normalizeCpf } from '@/src/services/auth.service';

async function normalizeExistingCpfs() {
  const users = await UserModel.find({ cpf: { $exists: true, $ne: null } })
    .select({ cpf: 1 })
    .lean()
    .exec();

  const duplicates = new Map<string, string[]>();

  for (const user of users) {
    const currentCpf = typeof user.cpf === 'string' ? user.cpf : '';
    if (!currentCpf) continue;
    const normalized = normalizeCpf(currentCpf);
    if (!normalized) continue;

    const existingIds = duplicates.get(normalized) ?? [];
    duplicates.set(normalized, [...existingIds, (user._id as mongoose.Types.ObjectId).toString()]);

    if (normalized !== currentCpf) {
      await UserModel.updateOne({ _id: user._id }, { $set: { cpf: normalized } }).exec();
    }
  }

  const conflicting = [...duplicates.entries()].filter(([, ids]) => ids.length > 1);

  if (conflicting.length > 0) {
    console.error('Foram encontrados CPFs duplicados. Resolva antes de continuar:');
    for (const [cpf, ids] of conflicting) {
      console.error(`CPF ${cpf}: usuários ${ids.join(', ')}`);
    }
    throw new Error('CPFs duplicados encontrados. Abortando criação do índice.');
  }
}

async function ensureCpfIndex() {
  const collection = UserModel.collection;
  const indexes = await collection.indexes();
  const hasCpfIndex = indexes.some(index => index.key && index.key.cpf === 1);

  if (!hasCpfIndex) {
    await collection.createIndex(
      { cpf: 1 },
      { unique: true, partialFilterExpression: { cpf: { $type: 'string' } }, name: 'cpf_unique' },
    );
    console.log('Índice único de CPF criado com sucesso.');
    return;
  }

  console.log('Índice de CPF já existe — nada a fazer.');
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  await dbConnect();
  await normalizeExistingCpfs();
  await ensureCpfIndex();
}

run()
  .then(() => {
    console.log('Migração concluída.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Falha ao executar migração de CPF:', error);
    process.exit(1);
  });
