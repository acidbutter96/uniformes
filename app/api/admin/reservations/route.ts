import { verifyAccessToken } from '@/src/services/auth.service';
import { Types } from 'mongoose';
import { listReservations } from '@/src/services/reservation.service';
import { ok, unauthorized, forbidden, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';

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
        return ok(data);
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
        return ok(data);
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
