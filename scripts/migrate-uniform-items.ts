import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import UniformModel from '@/src/lib/models/uniform';
import { UNIFORM_ITEM_KINDS, type UniformItemKind } from '@/src/types/uniform';

type UniformItemSeed = {
  kind: UniformItemKind;
  quantity: number;
  sizes: string[];
};

function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  const normalized = sizes.map(value => String(value).trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

function isValidItemKind(value: string): value is UniformItemKind {
  return (UNIFORM_ITEM_KINDS as readonly string[]).includes(value);
}

function inferKindFromName(name: string): UniformItemKind {
  const normalized = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (/(\bcalca\b|\bcalcas\b)/.test(normalized)) return 'calca';
  if (/(\bbermuda\b|\bbermudas\b|\bshort\b|\bshorts\b)/.test(normalized)) return 'bermuda';
  if (/(\bsaia\b|\bsaias\b)/.test(normalized)) return 'saia';
  if (/(\bjaqueta\b|\bcasaco\b|\bblusao\b)/.test(normalized)) return 'jaqueta';
  if (/(\bblusa\b|\bmoletom\b)/.test(normalized)) return 'blusa';
  if (/(\bcamiseta\b|\btee\b|\bshirt\b)/.test(normalized)) return 'camiseta';
  if (/(\bmeia\b|\bmeias\b)/.test(normalized)) return 'meia';

  return 'outro';
}

function normalizeItems(items: unknown): UniformItemSeed[] {
  if (!Array.isArray(items)) return [];

  const normalized = items
    .map(item => {
      const raw = item as Record<string, unknown>;
      const kindRaw = typeof raw.kind === 'string' ? raw.kind : '';
      const kind: UniformItemKind = isValidItemKind(kindRaw) ? kindRaw : 'outro';
      const quantityRaw = typeof raw.quantity === 'number' ? raw.quantity : Number(raw.quantity);
      const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.floor(quantityRaw)) : 1;
      const sizes = normalizeSizes(raw.sizes);

      return { kind, quantity, sizes } satisfies UniformItemSeed;
    })
    .filter(item => item.sizes.length > 0);

  return normalized;
}

function unionItemSizes(items: UniformItemSeed[]) {
  return Array.from(new Set(items.flatMap(item => item.sizes)));
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  const uniforms = await UniformModel.find({})
    .select({ name: 1, sizes: 1, items: 1 })
    .lean()
    .exec();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const uniform of uniforms) {
    const legacySizes = normalizeSizes((uniform as any).sizes);
    const currentItems = normalizeItems((uniform as any).items);

    let nextItems = currentItems;
    if (nextItems.length === 0 && legacySizes.length > 0) {
      nextItems = [
        {
          kind: inferKindFromName(String((uniform as any).name ?? '')),
          quantity: 1,
          sizes: legacySizes,
        },
      ];
    }

    const nextLegacySizes = legacySizes.length > 0 ? legacySizes : unionItemSizes(nextItems);

    const shouldUpdateItems =
      JSON.stringify(currentItems) !== JSON.stringify(nextItems) ||
      (Array.isArray((uniform as any).items) ? (uniform as any).items.length : 0) !==
        nextItems.length;

    const shouldUpdateSizes = JSON.stringify(legacySizes) !== JSON.stringify(nextLegacySizes);

    if (!shouldUpdateItems && !shouldUpdateSizes) {
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
          sizes: nextLegacySizes,
        },
      },
    ).exec();
  }

  console.log(
    `Uniforms migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${uniforms.length}, updated=${updatedCount}, skipped=${skippedCount}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de Uniform items:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
