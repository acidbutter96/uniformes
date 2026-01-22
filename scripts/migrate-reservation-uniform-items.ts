import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import UniformModel from '@/src/lib/models/uniform';

type UniformItemSelection = {
  uniform_item_id: mongoose.Types.ObjectId;
  size: string;
};

function parseCompositeSuggestedSize(value: string): string[] | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parts = normalized
    .split(' + ')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return null;
  }

  const sizes: string[] = [];
  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    const size = tokens.length > 0 ? tokens[tokens.length - 1] : null;
    if (!size) return null;
    sizes.push(size);
  }

  return sizes.length > 0 ? sizes : null;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  const reservations = await ReservationModel.find({})
    .select({ uniformId: 1, suggestedSize: 1, uniformItemSelections: 1 })
    .lean()
    .exec();

  let updatedCount = 0;
  let skippedCount = 0;
  let warningCount = 0;

  for (const reservation of reservations) {
    const existingSelections = Array.isArray((reservation as any).uniformItemSelections)
      ? (reservation as any).uniformItemSelections
      : [];

    if (existingSelections.length > 0) {
      skippedCount += 1;
      continue;
    }

    const uniformId = (reservation as any).uniformId;
    if (!uniformId) {
      skippedCount += 1;
      continue;
    }

    const uniform = await UniformModel.findById(uniformId)
      .select({ items: 1, sizes: 1, name: 1 })
      .lean()
      .exec();

    const uniformItems = Array.isArray((uniform as any)?.items) ? (uniform as any).items : [];

    if (uniformItems.length === 0) {
      // Nothing to link
      skippedCount += 1;
      continue;
    }

    const suggestedSize = String((reservation as any).suggestedSize ?? '').trim();

    const compositeSizes = parseCompositeSuggestedSize(suggestedSize);
    const nextSelections: UniformItemSelection[] = [];

    for (const [index, item] of uniformItems.entries()) {
      const itemId = item?._id;
      if (!itemId) {
        warningCount += 1;
        continue;
      }

      const sizes = Array.isArray(item.sizes) ? item.sizes.map((v: any) => String(v).trim()) : [];

      let picked = '';

      if (compositeSizes && compositeSizes[index]) {
        picked = compositeSizes[index] ?? '';
      } else if (suggestedSize) {
        picked = suggestedSize;
      }

      if (!picked) {
        picked = (sizes[0] ?? 'MANUAL').toString();
        warningCount += 1;
      }

      if (sizes.length > 0 && !sizes.includes(picked)) {
        picked = (sizes[0] ?? picked).toString();
        warningCount += 1;
      }

      nextSelections.push({ uniform_item_id: itemId, size: picked });
    }

    if (nextSelections.length === 0) {
      skippedCount += 1;
      continue;
    }

    updatedCount += 1;

    if (isDryRun) {
      continue;
    }

    await ReservationModel.updateOne(
      { _id: (reservation as any)._id },
      {
        $set: {
          uniformItemSelections: nextSelections,
        },
      },
    ).exec();
  }

  console.log(
    `Reservation uniform items migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${reservations.length}, updated=${updatedCount}, skipped=${skippedCount}, warnings=${warningCount}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de Reservas uniform items:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
