import { NextResponse } from 'next/server';
import { suppliers } from '@/app/lib/database';

export async function GET() {
  return NextResponse.json({ data: suppliers });
}
