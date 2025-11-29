import { verifyAccessToken } from '@/src/services/auth.service';
import { forbidden, unauthorized } from './responses';

export type TokenPayload = {
  role?: string;
  sub?: string;
};

export function ensureAdminAccess(request: Request) {
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
    if (payload.role !== 'admin') {
      return forbidden();
    }

    return null;
  } catch (error) {
    console.error('Admin auth verification failed', error);
    return unauthorized();
  }
}
