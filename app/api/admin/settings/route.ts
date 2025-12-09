import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/database';
import AppSettingsModel from '@/src/lib/models/appSettings';
import { ensureAdminAccess } from '@/app/api/utils/admin-auth';

export async function GET() {
  await dbConnect();
  const settings = (await AppSettingsModel.findOne().lean().exec()) ?? { maxChildrenPerUser: 7 };
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const authError = ensureAdminAccess(request);
  if (authError) {
    return authError;
  }

  await dbConnect();
  const body = await request.json().catch(() => null);
  const { maxChildrenPerUser } = body ?? {};
  const value = Number(maxChildrenPerUser);
  if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
    return NextResponse.json({ error: 'Valor inválido para máximo de crianças.' }, { status: 400 });
  }
  const doc = await AppSettingsModel.findOneAndUpdate(
    {},
    { maxChildrenPerUser: value },
    { upsert: true, new: true },
  )
    .lean()
    .exec();
  return NextResponse.json(doc);
}
