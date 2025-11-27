import { NextResponse } from 'next/server';
import { suppliers } from '@/lib/database';

export async function GET() {
  return NextResponse.json({ data: suppliers });
}
