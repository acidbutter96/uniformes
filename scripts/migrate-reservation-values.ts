import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import UniformModel from '@/src/lib/models/uniform';

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  const uniforms = await UniformModel.find({})
    .select({ price: 1 })
    .lean()
    .exec();

  const uniformPriceById = new Map<string, number>();
  for (const u of uniforms as Array<{ _id: unknown; price?: unknown }>) {
    const id = u?._id ? String(u._id) : null;
    const price = Number(u?.price);
    if (!id) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    uniformPriceById.set(id, price);
  }

  const reservations = await ReservationModel.find({})
    .select({ uniformId: 1, value: 1 })
    .lean()
    .exec();

  let updatedCount = 0;
  let skippedCount = 0;
  let missingUniformCount = 0;

  for (const r of reservations as Array<{ _id?: unknown; uniformId?: unknown; value?: unknown }>) {
    const reservationId = r?._id ? String(r._id) : null;
    if (!reservationId) {
      skippedCount += 1;
      continue;
    }

    const currentValue = Number(r?.value ?? 0);
    if (Number.isFinite(currentValue) && currentValue > 0) {
      skippedCount += 1;
      continue;
    }

    const uniformId = r?.uniformId ? String(r.uniformId) : null;
    if (!uniformId) {
      skippedCount += 1;
      continue;
    }

    const uniformPrice = uniformPriceById.get(uniformId);
    if (uniformPrice === undefined) {
      missingUniformCount += 1;
      continue;
    }

    updatedCount += 1;
    if (isDryRun) continue;

    await ReservationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(reservationId) },
      {
        $set: {
          value: uniformPrice,
        },
      },
    ).exec();
  }

  console.log(
    `Reservation value migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${reservations.length}, updated=${updatedCount}, skipped=${skippedCount}, missingUniform=${missingUniformCount}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de reservation value:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
