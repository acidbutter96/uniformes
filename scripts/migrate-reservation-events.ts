import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import { RESERVATION_STATUSES, type ReservationStatus } from '@/src/types/reservation';

function safeStatus(value: unknown): ReservationStatus {
  if (typeof value === 'string' && (RESERVATION_STATUSES as readonly string[]).includes(value)) {
    return value as ReservationStatus;
  }
  return 'aguardando';
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  await dbConnect();

  const reservations = await ReservationModel.find({
    $or: [{ events: { $exists: false } }, { events: { $size: 0 } }],
  })
    .select({ status: 1, createdAt: 1, updatedAt: 1 })
    .lean()
    .exec();

  let updatedCount = 0;

  for (const r of reservations as Array<{
    _id?: unknown;
    status?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  }>) {
    const id = r?._id ? String(r._id) : null;
    if (!id) continue;

    const status = safeStatus(r.status);
    const createdAt = r.createdAt instanceof Date ? r.createdAt : new Date();
    const updatedAt = r.updatedAt instanceof Date ? r.updatedAt : createdAt;

    const syntheticEvents: Array<Record<string, unknown>> = [
      {
        type: 'created',
        at: createdAt,
        status,
        actorRole: 'system',
      },
    ];

    if (updatedAt.getTime() !== createdAt.getTime() && status !== 'aguardando') {
      syntheticEvents.push({
        type: status === 'cancelada' ? 'cancelled' : 'status_changed',
        at: updatedAt,
        status,
        actorRole: 'system',
      });
    }

    updatedCount += 1;
    if (isDryRun) continue;

    await ReservationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          events: syntheticEvents,
        },
      },
    ).exec();
  }

  console.log(
    `Reservation events migration finished${isDryRun ? ' (dry-run)' : ''}: scanned=${reservations.length}, updated=${updatedCount}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Falha ao executar migração de reservation events:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
