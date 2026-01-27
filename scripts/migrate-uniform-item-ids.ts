import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import UniformModel from '@/src/lib/models/uniform';

function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  return sizes.map(value => String(value).trim()).filter(Boolean);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  const uniforms = await UniformModel.find({}).select({ items: 1 }).lean().exec();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const uniform of uniforms) {
    const rawItems = Array.isArray((uniform as any).items) ? (uniform as any).items : [];

    if (rawItems.length === 0) {
      skippedCount += 1;
      continue;
    }

    const nextItems = rawItems.map((item: any) => {
      const next = { ...item };

      if (!next._id) {
        next._id = new mongoose.Types.ObjectId();
      }

      if (next.sizes) {
        next.sizes = normalizeSizes(next.sizes);
      }

      return next;
    });

    const hasAnyMissingId = rawItems.some((item: any) => !item?._id);

    if (!hasAnyMissingId) {
      skippedCount += 1;
      continue;
    }

    updatedCount += 1;

    if (isDryRun) {
      continue;
    }

    await UniformModel.updateOne(
      { _id: (uniform as any)._id },
      {
        $set: {
          items: nextItems,
        },
      },
    ).exec();
  }

  console.log(
    `Uniform item ids migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${uniforms.length}, updated=${updatedCount}, skipped=${skippedCount}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de Uniform item ids:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
