import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        teams: {
          include: {
            decisions: {
              orderBy: { periodo: 'desc' }
            }
          }
        },
        rounds: {
          orderBy: { periodo: 'desc' }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const { configCasoJson, modoCompetitivo } = body;

    const dataToUpdate: any = {};
    if (configCasoJson !== undefined) {
      dataToUpdate.configCasoJson = typeof configCasoJson === 'string' ? configCasoJson : JSON.stringify(configCasoJson);
    }
    if (modoCompetitivo !== undefined) {
      dataToUpdate.modoCompetitivo = Boolean(modoCompetitivo);
    }

    const game = await prisma.game.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    return NextResponse.json(game);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const game = await prisma.game.findUnique({
      where: { id: params.id }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    await prisma.game.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Partida eliminada correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
