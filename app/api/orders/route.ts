import { NextResponse } from 'next/server';
import { orders } from '@/app/data/orders';

export async function GET() {
  return NextResponse.json({ data: orders });
}
