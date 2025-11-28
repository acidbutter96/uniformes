import { NextResponse } from 'next/server';

import { ensureAdminAccess } from '@/app/api/utils/admin-auth';
import { getAll } from '@/src/services/user.service';

export async function GET(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const users = await getAll();
    const data = users.map(rawUser => {
      const record = { ...(rawUser as unknown as Record<string, unknown>) };
      const rawId = record._id;
      delete record.password;
      delete record.__v;
      delete record._id;

      const id =
        typeof rawId === 'object' &&
        rawId !== null &&
        typeof (rawId as { toString?: () => string }).toString === 'function'
          ? (rawId as { toString: () => string }).toString()
          : ((rawId as string | number | undefined)?.toString() ?? '');

      return { id, ...record };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list users', error);
    return NextResponse.json({ error: 'Unable to fetch users.' }, { status: 500 });
  }
}
