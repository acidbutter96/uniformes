import { NextResponse } from 'next/server';
import { suppliers } from '@/app/data/suppliers';

export async function GET() {
  return NextResponse.json({ data: suppliers });
}
