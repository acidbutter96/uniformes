import { NextResponse } from 'next/server';

import { orders, uniforms, schools, getById } from '@/lib/database';

export async function GET() {
  return NextResponse.json({ data: orders });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { userName, schoolId, uniformId, measurements, suggestedSize } = payload ?? {};

    if (!userName || !schoolId || !uniformId || !measurements || !suggestedSize) {
      return NextResponse.json(
        { error: 'Preencha userName, schoolId, uniformId, measurements e suggestedSize.' },
        { status: 400 },
      );
    }

    const school = getById(schools, schoolId);
    const uniform = getById(uniforms, uniformId);

    if (!school) {
      return NextResponse.json({ error: 'Escola não encontrada.' }, { status: 404 });
    }

    if (!uniform) {
      return NextResponse.json({ error: 'Uniforme não encontrado.' }, { status: 404 });
    }

    const newOrder = {
      id: `order-${String(orders.length + 1).padStart(3, '0')}`,
      userName,
      schoolId,
      uniformId,
      measurements,
      suggestedSize,
      createdAt: new Date().toISOString(),
    };

    orders.push(newOrder);

    return NextResponse.json({ data: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar o pedido. Tente novamente.' },
      { status: 500 },
    );
  }
}
