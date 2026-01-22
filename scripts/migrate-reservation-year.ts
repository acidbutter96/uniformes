import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';

function getUTCYear(value: unknown): number {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return new Date().getUTCFullYear();
  }
  return date.getUTCFullYear();
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  // 1) Backfill reservationYear where missing
  const reservations = await ReservationModel.find({})
    .select({ createdAt: 1, reservationYear: 1, childId: 1 })
    .lean()
    .exec();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const r of reservations) {
    const hasYear = typeof (r as any).reservationYear === 'number';
    if (hasYear) {
      skippedCount += 1;
      continue;
    }

    const year = getUTCYear((r as any).createdAt);
    updatedCount += 1;

    if (isDryRun) continue;

    await ReservationModel.updateOne(
      { _id: (r as any)._id },
      {
        $set: {
          reservationYear: year,
        },
      },
    ).exec();
  }

  // 2) Detect duplicates that would block the unique index
  const duplicates = await ReservationModel.aggregate([
    {
      $group: {
        _id: { childId: '$childId', reservationYear: '$reservationYear' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 50 },
  ]).exec();

  if (duplicates.length > 0) {
    console.error(
      `Foram encontradas reservas duplicadas para o mesmo aluno/ano. Resolva antes de criar o índice único. Exemplos (até 50):`,
    );
    for (const d of duplicates) {
      console.error(JSON.stringify(d));
    }

    await mongoose.disconnect();
    process.exitCode = 2;
    return;
  }

  // 3) Create unique index (childId, reservationYear)
  if (!isDryRun) {
    await ReservationModel.collection.createIndex(
      { childId: 1, reservationYear: 1 },
      { unique: true, name: 'uniq_child_year' },
    );
  }

  console.log(
    `Reservation year migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${reservations.length}, updated=${updatedCount}, skipped=${skippedCount}, index=${isDryRun ? 'skipped' : 'created'}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de reservationYear:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
