import 'dotenv/config';

import mongoose, { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import SchoolModel from '@/src/lib/models/school';
import SupplierModel from '@/src/lib/models/supplier';
import UniformModel from '@/src/lib/models/uniform';
import UserModel from '@/src/lib/models/user';
import type { ReservationStatus } from '@/src/types/reservation';

type CliOptions = {
  supplierId: string;
  userId: string;
  count: number;
  days: number;
  seed: number;
  dryRun: boolean;
  deliveredRate: number;
  cancelRate: number;
  wipRate: number;
};

function parseNumber(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseArgValue(args: string[], key: string): string | undefined {
  const idx = args.indexOf(key);
  if (idx === -1) return undefined;
  const candidate = args[idx + 1];
  if (!candidate || candidate.startsWith('--')) return undefined;
  return candidate;
}

function hasFlag(args: string[], key: string) {
  return args.includes(key);
}

function parseOptions(argv: string[]): CliOptions {
  const supplierId = parseArgValue(argv, '--supplierId') ?? '';
  const userId = parseArgValue(argv, '--userId') ?? '';

  const count = Math.max(1, Math.floor(parseNumber(parseArgValue(argv, '--count'), 80)));
  const days = Math.min(
    365,
    Math.max(7, Math.floor(parseNumber(parseArgValue(argv, '--days'), 120))),
  );
  const seed = Math.floor(parseNumber(parseArgValue(argv, '--seed'), Date.now()));

  const dryRun = hasFlag(argv, '--dry-run');

  const deliveredRate = clamp01(parseNumber(parseArgValue(argv, '--deliveredRate'), 0.6));
  const cancelRate = clamp01(parseNumber(parseArgValue(argv, '--cancelRate'), 0.15));
  const wipRate = clamp01(parseNumber(parseArgValue(argv, '--wipRate'), 0.25));

  return {
    supplierId,
    userId,
    count,
    days,
    seed,
    dryRun,
    deliveredRate,
    cancelRate,
    wipRate,
  };
}

function usage() {
  // eslint-disable-next-line no-console
  console.log(
    `\nGera reservas mock (com eventos) para popular os gráficos do dashboard.\n\nUso:\n  yarn -s migrate:reservation-mocks --supplierId <ObjectId> --userId <ObjectId> [opções]\n\nOpções:\n  --count <n>            Quantidade de reservas (default: 80)\n  --days <n>             Janela de criação (now - days) (default: 120)\n  --seed <n>             Seed RNG (default: Date.now)\n  --deliveredRate <0-1>  Fração entregues (default: 0.6)\n  --cancelRate <0-1>     Fração canceladas (default: 0.15)\n  --wipRate <0-1>        Fração em andamento (default: 0.25)\n  --dry-run              Não escreve no banco, só imprime resumo\n\nExemplo:\n  yarn -s migrate:reservation-mocks --supplierId 65f0... --userId 65f1... --count 120 --days 180\n`,
  );
}

// Deterministic PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi <= lo) return lo;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function randomPick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

const STATUS_FLOW: readonly ReservationStatus[] = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
  'entregue',
];

const WIP_STATUSES: readonly ReservationStatus[] = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
];

function buildStatusTimeline(params: {
  rng: () => number;
  createdAt: Date;
  finalStatus: ReservationStatus;
  cancelAtStage?: number;
}) {
  const { rng, createdAt, finalStatus, cancelAtStage } = params;

  // increments in days between stages
  const stepDays = [
    randomInt(rng, 0, 2), // created -> recebida
    randomInt(rng, 1, 5), // recebida -> em-processamento
    randomInt(rng, 1, 6), // em-processamento -> finalizada
    randomInt(rng, 0, 4), // finalizada -> entregue
  ];

  const events: Array<{
    type: 'created' | 'status_changed' | 'cancelled';
    at: Date;
    status: ReservationStatus;
    actorRole: string;
    actorUserId?: Types.ObjectId;
  }> = [];

  // Always create with aguardando
  let cursor = new Date(createdAt);
  events.push({
    type: 'created',
    at: cursor,
    status: 'aguardando',
    actorRole: 'system',
  });

  // If final is aguardando, we're done.
  if (finalStatus === 'aguardando') {
    return { events, updatedAt: cursor, status: finalStatus };
  }

  // Walk forward through flow.
  for (let stage = 1; stage < STATUS_FLOW.length; stage += 1) {
    const nextStatus = STATUS_FLOW[stage]!;

    cursor = addDays(cursor, stepDays[stage - 1] ?? 1);

    if (cancelAtStage !== undefined && stage === cancelAtStage) {
      // Cancel at this point
      events.push({
        type: 'cancelled',
        at: cursor,
        status: 'cancelada',
        actorRole: 'system',
      });
      return { events, updatedAt: cursor, status: 'cancelada' as ReservationStatus };
    }

    // If we are targeting a WIP final status, stop when we reach it.
    if (nextStatus === finalStatus) {
      events.push({
        type: 'status_changed',
        at: cursor,
        status: nextStatus,
        actorRole: 'system',
      });
      return { events, updatedAt: cursor, status: finalStatus };
    }

    // Otherwise keep moving, but only emit transitions up to delivered.
    if (finalStatus === 'entregue') {
      events.push({
        type: 'status_changed',
        at: cursor,
        status: nextStatus,
        actorRole: 'system',
      });
      if (nextStatus === 'entregue') {
        return { events, updatedAt: cursor, status: finalStatus };
      }
      continue;
    }
  }

  return { events, updatedAt: cursor, status: finalStatus };
}

async function run() {
  const opts = parseOptions(process.argv);

  if (hasFlag(process.argv, '--help') || hasFlag(process.argv, '-h')) {
    usage();
    return;
  }

  if (!process.env.MONGODB_URI && !process.env.DB_NAME) {
    throw new Error('Missing Mongo configuration. Provide MONGODB_URI or DB_NAME in .env');
  }

  if (!Types.ObjectId.isValid(opts.supplierId)) {
    throw new Error('Parâmetro --supplierId inválido (precisa ser ObjectId).');
  }

  if (!Types.ObjectId.isValid(opts.userId)) {
    throw new Error('Parâmetro --userId inválido (precisa ser ObjectId).');
  }

  const ratesSum = opts.deliveredRate + opts.cancelRate + opts.wipRate;
  if (Math.abs(ratesSum - 1) > 0.0001) {
    throw new Error(
      `Rates inválidas: deliveredRate + cancelRate + wipRate deve somar 1 (atual=${ratesSum}).`,
    );
  }

  await dbConnect();

  const supplierObjectId = new Types.ObjectId(opts.supplierId);
  const userObjectId = new Types.ObjectId(opts.userId);

  const [supplier, user] = await Promise.all([
    SupplierModel.findById(supplierObjectId).select({ schoolIds: 1, name: 1 }).lean().exec(),
    UserModel.findById(userObjectId).select({ name: 1 }).lean().exec(),
  ]);

  if (!supplier) {
    throw new Error('Fornecedor não encontrado para o supplierId informado.');
  }
  if (!user) {
    throw new Error('Usuário não encontrado para o userId informado.');
  }

  const supplierSchoolIds = Array.isArray((supplier as { schoolIds?: Types.ObjectId[] }).schoolIds)
    ? ((supplier as { schoolIds?: Types.ObjectId[] }).schoolIds ?? [])
    : [];

  const fallbackSchool = await SchoolModel.findOne().select({ _id: 1 }).lean().exec();
  if (!fallbackSchool && supplierSchoolIds.length === 0) {
    throw new Error('Nenhuma escola encontrada no banco. Rode o seed primeiro.');
  }

  const uniforms = await UniformModel.find({})
    .select({ _id: 1, price: 1, sizes: 1 })
    .lean<{ _id: Types.ObjectId; price?: number; sizes?: string[] }[]>()
    .exec();

  if (!uniforms || uniforms.length === 0) {
    throw new Error('Nenhum uniforme encontrado no banco. Rode o seed primeiro.');
  }

  const now = new Date();
  const start = new Date(now.getTime() - opts.days * 24 * 60 * 60 * 1000);

  const rng = mulberry32(opts.seed);

  const defaultSizes = ['PP', 'P', 'M', 'G', 'GG'] as const;

  const docs: Array<Record<string, unknown>> = [];

  for (let i = 0; i < opts.count; i += 1) {
    const uniform = randomPick(rng, uniforms);

    const createdAt = new Date(
      start.getTime() + Math.floor(rng() * (now.getTime() - start.getTime())),
    );

    const roll = rng();

    let finalStatus: ReservationStatus;
    let cancelAtStage: number | undefined;

    if (roll < opts.cancelRate) {
      finalStatus = 'cancelada';
      // cancel after reaching stage 0..3 (recebida/em-processamento/finalizada) with a bias to earlier
      cancelAtStage = randomPick(rng, [1, 1, 2, 2, 3] as const);
    } else if (roll < opts.cancelRate + opts.deliveredRate) {
      finalStatus = 'entregue';
    } else {
      // WIP
      finalStatus = randomPick(rng, [
        'aguardando',
        'recebida',
        'em-processamento',
        'finalizada',
      ] as const);
    }

    const timeline = buildStatusTimeline({ rng, createdAt, finalStatus, cancelAtStage });

    const schoolId =
      supplierSchoolIds.length > 0
        ? randomPick(rng, supplierSchoolIds)
        : (fallbackSchool!._id as Types.ObjectId);

    const sizes = Array.isArray(uniform.sizes) && uniform.sizes.length > 0 ? uniform.sizes : [];
    const suggestedSize = (
      sizes.length > 0 ? randomPick(rng, sizes) : randomPick(rng, defaultSizes)
    ).toString();

    // optional measurements (not used by dashboard analytics)
    const includeMeasurements = rng() < 0.7;
    const measurements = includeMeasurements
      ? {
          height: randomInt(rng, 90, 180),
          chest: randomInt(rng, 50, 110),
          waist: randomInt(rng, 45, 105),
          hips: randomInt(rng, 50, 115),
        }
      : undefined;

    const value = Number(uniform.price ?? 0);

    docs.push({
      userName: String((user as { name?: unknown }).name ?? 'Usuário'),
      userId: userObjectId,
      childId: new Types.ObjectId(),
      schoolId,
      uniformId: uniform._id,
      supplierId: supplierObjectId,
      measurements,
      suggestedSize,
      reservationYear: createdAt.getUTCFullYear(),
      status: timeline.status,
      events: timeline.events,
      value: Number.isFinite(value) && value >= 0 ? value : 0,
      createdAt,
      updatedAt: timeline.updatedAt,
    });
  }

  const sample = docs[0];

  if (opts.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      `DRY-RUN: would insert ${docs.length} reservations for supplier=${opts.supplierId}, user=${opts.userId} (seed=${opts.seed})`,
    );
    // eslint-disable-next-line no-console
    console.log('Sample doc:', JSON.stringify(sample, null, 2));
    await mongoose.disconnect();
    return;
  }

  const result = await ReservationModel.insertMany(docs, {
    ordered: false,
  });

  // eslint-disable-next-line no-console
  console.log(
    `Inserted ${result.length}/${docs.length} reservation mocks for supplier=${opts.supplierId}, user=${opts.userId}`,
  );

  await mongoose.disconnect();
}

run().catch(async error => {
  // eslint-disable-next-line no-console
  console.error('Falha ao gerar reservas mock:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
