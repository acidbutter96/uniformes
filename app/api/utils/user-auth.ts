import { verifyAccessToken } from '@/src/services/auth.service';
import { forbidden, unauthorized } from './responses';

export type TokenPayload = {
  role?: string;
  sub?: string;
};

type UserAccessResult =
  | { payload: Required<Pick<TokenPayload, 'sub'>> & TokenPayload }
  | { response: Response };

export function ensureUserAccess(request: Request): UserAccessResult {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: unauthorized() };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { response: unauthorized() };
  }

  try {
    const payload = verifyAccessToken<TokenPayload>(token);
    if (!payload?.sub) {
      return { response: unauthorized() };
    }

    if (payload.role === 'admin') {
      return { response: forbidden() };
    }

    return { payload: { ...payload, sub: payload.sub } };
  } catch (error) {
    console.error('User auth verification failed', error);
    return { response: unauthorized() };
  }
}
