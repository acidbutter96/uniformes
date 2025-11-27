import { NextResponse } from 'next/server';
import { schools } from '@/lib/database';

export async function GET() {
  return NextResponse.json({ data: schools });
}
