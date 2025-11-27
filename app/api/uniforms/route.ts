import { NextResponse } from 'next/server';
import { uniforms } from '@/app/data/uniforms';

export async function GET() {
  return NextResponse.json({ data: uniforms });
}
