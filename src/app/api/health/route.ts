import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: 'ok' });
  } catch (error) {
    console.error('Health check falló:', error);
    return NextResponse.json({ estado: 'error' }, { status: 503 });
  }
}
