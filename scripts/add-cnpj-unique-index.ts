import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import SupplierModel from '@/src/lib/models/supplier';

function normalizeCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits;
}

async function normalizeExistingCnpjs() {
  const suppliers = await SupplierModel.find({ cnpj: { $exists: true, $ne: null } })
    .select({ cnpj: 1 })
    .lean()
    .exec();

  const duplicates = new Map<string, string[]>();

  for (const supplier of suppliers) {
    const currentCnpj = typeof supplier.cnpj === 'string' ? supplier.cnpj : '';
    if (!currentCnpj) continue;
    const normalized = normalizeCnpj(currentCnpj);
    if (!normalized) continue;

    const existingIds = duplicates.get(normalized) ?? [];
    duplicates.set(normalized, [
      ...existingIds,
      (supplier._id as mongoose.Types.ObjectId).toString(),
    ]);

    if (normalized !== currentCnpj) {
      await SupplierModel.updateOne({ _id: supplier._id }, { $set: { cnpj: normalized } }).exec();
    }
  }

  const conflicting = [...duplicates.entries()].filter(([, ids]) => ids.length > 1);

  if (conflicting.length > 0) {
    console.error('Foram encontrados CNPJs duplicados. Resolva antes de continuar:');
    for (const [cnpj, ids] of conflicting) {
      console.error(`CNPJ ${cnpj}: fornecedores ${ids.join(', ')}`);
    }
    throw new Error('CNPJs duplicados encontrados. Abortando criação do índice.');
  }
}

async function ensureCnpjIndex() {
  const collection = SupplierModel.collection;
  const indexes = await collection.indexes();
  const hasCnpjIndex = indexes.some(index => index.key && index.key.cnpj === 1);

  if (!hasCnpjIndex) {
    await collection.createIndex(
      { cnpj: 1 },
      { unique: true, partialFilterExpression: { cnpj: { $type: 'string' } }, name: 'cnpj_unique' },
    );
    console.log('Índice único de CNPJ criado com sucesso.');
    return;
  }

  console.log('Índice de CNPJ já existe — nada a fazer.');
}

async function seedMissingCnpjField() {
  // Ensure all documents have the cnpj field present (null by default) for clarity
  await SupplierModel.updateMany(
    { cnpj: { $exists: false } },
    { $set: { cnpj: null } },
    { strict: false },
  ).exec();
  console.log('Campo cnpj adicionado como null onde não existia.');
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  await dbConnect();
  await seedMissingCnpjField();
  await normalizeExistingCnpjs();
  await ensureCnpjIndex();
}

run()
  .then(() => {
    console.log('Migração de CNPJ concluída.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Falha ao executar migração de CNPJ:', error);
    process.exit(1);
  });
