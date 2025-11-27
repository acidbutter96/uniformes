import { NextResponse } from 'next/server';
import { schools } from '@/app/lib/database';

export async function GET() {
  return NextResponse.json({ data: schools });
}
