import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        teams: {
          include: {
            decisions: true
          }
        },
        rounds: {
          orderBy: { periodo: 'asc' }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    const updated = await prisma.game.update({
      where: { id: params.id },
      data: {
        estado: 'finalizada'
      },
      include: {
        teams: {
          include: {
            decisions: {
              orderBy: { periodo: 'asc' }
            }
          }
        },
        rounds: {
          orderBy: { periodo: 'asc' }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
