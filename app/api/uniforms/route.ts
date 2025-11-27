import { NextResponse } from 'next/server';
import { uniforms } from '@/lib/database';

export async function GET() {
  return NextResponse.json({ data: uniforms });
}
