import { NextResponse } from 'next/server';
import { schools } from '@/app/data/schools';

export async function GET() {
  return NextResponse.json({ data: schools });
}
