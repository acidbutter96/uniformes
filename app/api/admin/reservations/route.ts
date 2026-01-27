import { verifyAccessToken } from '@/src/services/auth.service';
import { Types } from 'mongoose';
import { listReservations } from '@/src/services/reservation.service';
import { ok, unauthorized, forbidden, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import type { ReservationDTO } from '@/src/types/reservation';

type TokenPayload = {
  role?: string;
  sub?: string;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return unauthorized();
    }

    try {
      const payload = verifyAccessToken<TokenPayload>(token);
      if (!payload?.sub) {
        return unauthorized();
      }

      if (payload.role === 'admin') {
        const data = await listReservations();

        await dbConnect();
        const childMap = await buildChildNameLookup(data);
        return ok(
          data.map(r => ({
            ...r,
            childName: childMap[r.childId],
          })),
        );
      }

      if (payload.role === 'supplier') {
        if (!Types.ObjectId.isValid(payload.sub)) {
          return unauthorized();
        }

        await dbConnect();
        const user = await UserModel.findById(payload.sub).select({ supplierId: 1 }).lean().exec();
        const supplierId =
          user && typeof user === 'object' && 'supplierId' in user
            ? ((user as { supplierId?: Types.ObjectId | null }).supplierId ?? null)
            : null;

        if (!supplierId) {
          return ok([]);
        }

        const data = await listReservations({ supplierId });

        const childMap = await buildChildNameLookup(data);
        return ok(
          data.map(r => ({
            ...r,
            childName: childMap[r.childId],
          })),
        );
      }

      return forbidden();
    } catch (error) {
      console.error('Admin reservations auth failed', error);
      return unauthorized();
    }
  } catch (error) {
    console.error('Failed to list admin reservations', error);
    return serverError('Não foi possível carregar as reservas.');
  }
}

async function buildChildNameLookup(reservations: ReservationDTO[]) {
  const userIds = Array.from(
    new Set(
      reservations.map(r => (typeof r.userId === 'string' ? r.userId : null)).filter(Boolean),
    ),
  ) as string[];

  if (userIds.length === 0) {
    return {} as Record<string, string>;
  }

  type LeanUser = { children?: Array<{ _id?: Types.ObjectId; name?: unknown }> };
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select({ children: 1 })
    .lean<LeanUser[]>()
    .exec();

  const map: Record<string, string> = {};
  for (const user of users ?? []) {
    const children = Array.isArray(user?.children) ? user.children : [];
    for (const child of children) {
      const id = child?._id ? child._id.toString() : null;
      const name = typeof child?.name === 'string' ? child.name.trim() : '';
      if (id && name) {
        map[id] = name;
      }
    }
  }

  return map;
}
