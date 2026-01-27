import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import AppSettingsModel from '@/src/lib/models/appSettings';
import ReservationModel from '@/src/lib/models/reservation';
import UserModel from '@/src/lib/models/user';
import { verifyAccessToken } from '@/src/services/auth.service';
import { forbidden, ok, unauthorized } from '@/app/api/utils/responses';
import type { ReservationStatus } from '@/src/types/reservation';

type TokenPayload = {
  role?: string;
  sub?: string;
};

const OPERATIONS_STATUSES: readonly ReservationStatus[] = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
  'entregue',
  'cancelada',
];

function normalizeStatus(status: unknown): ReservationStatus {
  if (status === 'em-producao') return 'em-processamento';
  if (status === 'enviado') return 'entregue';

  if (typeof status === 'string' && (OPERATIONS_STATUSES as readonly string[]).includes(status)) {
    return status as ReservationStatus;
  }

  return 'aguardando';
}

function parseDays(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(365, Math.max(7, Math.floor(parsed)));
}

function parseHours(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(168, Math.max(1, Math.floor(parsed)));
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  // Accept YYYY-MM-DD (preferred) or ISO-like values.
  const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  const parsed = new Date(yyyyMmDd ?? value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toUtcDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUtcHourKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:00Z`;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

function startOfUtcHour(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      0,
      0,
      0,
    ),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

function endOfUtcHour(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      59,
      59,
      999,
    ),
  );
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base] === undefined) return 0;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

type EventLike = {
  at?: unknown;
  status?: unknown;
};

type ReservationLike = {
  _id: Types.ObjectId;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  events?: unknown;
};

function coerceDate(value: unknown, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return fallback;
}

function buildTimeline(reservation: ReservationLike) {
  const createdAt = coerceDate(reservation.createdAt, new Date());
  const fallbackStatus = normalizeStatus(reservation.status);

  const rawEvents = Array.isArray(reservation.events) ? (reservation.events as EventLike[]) : [];

  const timeline = rawEvents
    .map(e => {
      const at = coerceDate(e.at, createdAt);
      const status = normalizeStatus(e.status ?? fallbackStatus);
      return { at, status };
    })
    .filter(e => e.at instanceof Date && !Number.isNaN(e.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  if (timeline.length === 0) {
    timeline.push({ at: createdAt, status: fallbackStatus });
  } else {
    // ensure we have a baseline at createdAt
    if (timeline[0]!.at.getTime() > createdAt.getTime()) {
      timeline.unshift({ at: createdAt, status: fallbackStatus });
    }
  }

  return {
    createdAt,
    updatedAt: coerceDate(reservation.updatedAt, createdAt),
    timeline,
  };
}

function statusAt(timeline: Array<{ at: Date; status: ReservationStatus }>, moment: Date) {
  let last: ReservationStatus | null = null;
  for (const e of timeline) {
    if (e.at.getTime() <= moment.getTime()) {
      last = e.status;
    } else {
      break;
    }
  }
  return last;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return unauthorized();
  }

  let payload: TokenPayload;
  try {
    payload = verifyAccessToken<TokenPayload>(token);
  } catch {
    return unauthorized();
  }

  if (!payload?.sub) {
    return unauthorized();
  }

  if (payload.role !== 'admin' && payload.role !== 'supplier') {
    return forbidden();
  }

  const fromParam = request.nextUrl.searchParams.get('from');
  const toParam = request.nextUrl.searchParams.get('to');
  const hoursParam = request.nextUrl.searchParams.get('hours');
  const bucketParam = request.nextUrl.searchParams.get('bucket');

  const parsedFrom = parseDateParam(fromParam);
  const parsedTo = parseDateParam(toParam);

  const requestedBucket = bucketParam === 'hour' || bucketParam === 'day' ? bucketParam : null;
  const hasExplicitHours = hoursParam !== null;
  const hasTimeInParams = Boolean(
    (typeof fromParam === 'string' && fromParam.includes('T')) ||
      (typeof toParam === 'string' && toParam.includes('T')),
  );

  const bucketUnit: 'hour' | 'day' =
    requestedBucket === 'hour' || hasExplicitHours || hasTimeInParams ? 'hour' : 'day';

  const defaultHours = parseHours(hoursParam, 24);

  const defaultDays = parseDays(request.nextUrl.searchParams.get('days'), 30);

  // Range + bucket granularity
  const rangeEnd =
    bucketUnit === 'hour'
      ? (parsedTo ?? new Date())
      : parsedTo
        ? endOfUtcDay(parsedTo)
        : new Date();

  const rangeStart =
    bucketUnit === 'hour'
      ? (parsedFrom ?? new Date(rangeEnd.getTime() - defaultHours * 60 * 60 * 1000))
      : parsedFrom
        ? startOfUtcDay(parsedFrom)
        : new Date(rangeEnd.getTime() - defaultDays * 24 * 60 * 60 * 1000);

  const now = rangeEnd;
  const start = rangeStart;

  const rangeUnit: 'hours' | 'days' = bucketUnit === 'hour' ? 'hours' : 'days';
  const rangeValue =
    bucketUnit === 'hour'
      ? Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (60 * 60 * 1000)))
      : Math.min(
          365,
          Math.max(
            1,
            Math.ceil(
              (endOfUtcDay(now).getTime() - startOfUtcDay(start).getTime()) / (24 * 60 * 60 * 1000),
            ),
          ),
        );

  await dbConnect();

  const settings = await AppSettingsModel.findOne()
    .select({ dashboardChartsEnabled: 1 })
    .lean()
    .exec();
  const dashboardChartsEnabled = Boolean(settings?.dashboardChartsEnabled);

  if (!dashboardChartsEnabled) {
    return ok({ dashboardChartsEnabled: false });
  }

  let supplierId: Types.ObjectId | null = null;

  if (payload.role === 'supplier') {
    if (!Types.ObjectId.isValid(payload.sub)) {
      return unauthorized();
    }

    const user = await UserModel.findById(payload.sub).select({ supplierId: 1 }).lean().exec();
    supplierId =
      user && typeof user === 'object' && 'supplierId' in user
        ? ((user as { supplierId?: Types.ObjectId | null }).supplierId ?? null)
        : null;

    if (!supplierId) {
      return forbidden();
    }
  }

  const baseMatch: Record<string, unknown> = {
    $and: [
      // Only consider reservations that exist by the end of the selected range
      { createdAt: { $lte: now } },
      {
        // Include anything that changed within the range OR is still open (carry-over)
        $or: [
          { createdAt: { $gte: start } },
          { updatedAt: { $gte: start } },
          { 'events.at': { $gte: start } },
          { status: { $nin: ['entregue', 'cancelada'] } },
        ],
      },
    ],
  };

  if (supplierId) {
    baseMatch.supplierId = supplierId;
  }

  const reservations = (await ReservationModel.find(baseMatch)
    .select({ status: 1, createdAt: 1, updatedAt: 1, events: 1 })
    .lean()
    .exec()) as ReservationLike[];

  // Build buckets (UTC)
  const buckets: Date[] = [];
  if (bucketUnit === 'hour') {
    const startHour = startOfUtcHour(start);
    const endHour = startOfUtcHour(now);
    for (
      let cursor = new Date(startHour);
      cursor.getTime() <= endHour.getTime();
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000)
    ) {
      buckets.push(new Date(cursor));
    }
  } else {
    const startDay = startOfUtcDay(start);
    const endDay = startOfUtcDay(now);
    for (
      let cursor = new Date(startDay);
      cursor.getTime() <= endDay.getTime();
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      buckets.push(new Date(cursor));
    }
  }

  // CFD
  const cfd = buckets.map(day => {
    const point: Record<string, unknown> = {
      date: bucketUnit === 'hour' ? toUtcHourKey(day) : toUtcDateKey(day),
    };
    for (const status of OPERATIONS_STATUSES) {
      point[status] = 0;
    }

    const moment = bucketUnit === 'hour' ? endOfUtcHour(day) : endOfUtcDay(day);

    for (const r of reservations) {
      const { createdAt, timeline } = buildTimeline(r);
      if (createdAt.getTime() > moment.getTime()) continue;

      const s = statusAt(timeline, moment);
      if (!s) continue;

      point[s] = (Number(point[s]) || 0) + 1;
    }

    return point as {
      date: string;
    } & Record<ReservationStatus, number>;
  });

  // Throughput + cycle time
  const throughputDelivered: Record<string, number> = {};
  const throughputCancelled: Record<string, number> = {};
  const cycleByDay: Record<string, number[]> = {};

  const startMs = start.getTime();

  for (const r of reservations) {
    const { createdAt, timeline } = buildTimeline(r);

    let deliveredAt: Date | null = null;
    let cancelledAt: Date | null = null;

    for (const e of timeline) {
      if (e.at.getTime() < startMs) continue;

      if (!deliveredAt && e.status === 'entregue') {
        deliveredAt = e.at;
      }
      if (!cancelledAt && e.status === 'cancelada') {
        cancelledAt = e.at;
      }

      if (deliveredAt && cancelledAt) break;
    }

    if (deliveredAt) {
      const key = toUtcDateKey(deliveredAt);
      throughputDelivered[key] = (throughputDelivered[key] ?? 0) + 1;

      const cycleDays = (deliveredAt.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (!cycleByDay[key]) cycleByDay[key] = [];
      cycleByDay[key]!.push(Math.max(0, cycleDays));
    }

    if (cancelledAt) {
      const key = toUtcDateKey(cancelledAt);
      throughputCancelled[key] = (throughputCancelled[key] ?? 0) + 1;
    }
  }

  const throughput = buckets.map(day => {
    const key = bucketUnit === 'hour' ? toUtcHourKey(day) : toUtcDateKey(day);
    return {
      date: key,
      entregues: throughputDelivered[key] ?? 0,
      canceladas: throughputCancelled[key] ?? 0,
    };
  });

  const cycleTime = buckets.map(day => {
    const key = bucketUnit === 'hour' ? toUtcHourKey(day) : toUtcDateKey(day);
    const values = cycleByDay[key] ?? [];
    return {
      date: key,
      count: values.length,
      medianDays: Number(quantile(values, 0.5).toFixed(1)),
      p90Days: Number(quantile(values, 0.9).toFixed(1)),
    };
  });

  // Aging WIP snapshot
  const agingBuckets = [
    { key: '0-2', min: 0, max: 2 },
    { key: '3-7', min: 3, max: 7 },
    { key: '8-14', min: 8, max: 14 },
    { key: '15+', min: 15, max: Infinity },
  ] as const;

  const agingTotals: Record<(typeof agingBuckets)[number]['key'], number> = {
    '0-2': 0,
    '3-7': 0,
    '8-14': 0,
    '15+': 0,
  };

  const staleByStatus: Record<ReservationStatus, number> = {
    aguardando: 0,
    recebida: 0,
    'em-processamento': 0,
    finalizada: 0,
    entregue: 0,
    cancelada: 0,
    enviado: 0,
    'em-producao': 0,
  };

  for (const r of reservations) {
    const { createdAt, timeline } = buildTimeline(r);
    const currentStatus = statusAt(timeline, now) ?? normalizeStatus(r.status);

    if (currentStatus === 'entregue' || currentStatus === 'cancelada') continue;

    let enteredAt = createdAt;
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const e = timeline[i]!;
      if (e.status === currentStatus) {
        enteredAt = e.at;
        break;
      }
    }

    const ageDays = Math.floor((now.getTime() - enteredAt.getTime()) / (24 * 60 * 60 * 1000));
    const bucket = agingBuckets.find(b => ageDays >= b.min && ageDays <= b.max) ?? agingBuckets[3];
    agingTotals[bucket.key] += 1;

    staleByStatus[currentStatus] = (staleByStatus[currentStatus] ?? 0) + 1;
  }

  const agingWip = agingBuckets.map(b => ({ bucket: b.key, count: agingTotals[b.key] }));

  const staleByStatusList = OPERATIONS_STATUSES.filter(
    s => s !== 'entregue' && s !== 'cancelada',
  ).map(status => ({ status, count: staleByStatus[status] ?? 0 }));

  return ok({
    dashboardChartsEnabled: true,
    rangeUnit,
    rangeValue,
    bucketUnit,
    rangeDays: rangeUnit === 'days' ? rangeValue : Math.max(1, Math.ceil(rangeValue / 24)),
    cfd,
    throughput,
    cycleTime,
    agingWip,
    staleByStatus: staleByStatusList,
  });
}
