import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { nombre, esHumano = true, personalidad } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del equipo es obligatorio' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: params.id }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    const team = await prisma.team.create({
      data: {
        gameId: game.id,
        nombre: nombre.trim(),
        esHumano: Boolean(esHumano),
        personalidad: personalidad || null,
        planta: 50000,
        capital: 70000,
        efectivo: 0,
        stockUnidades: 0,
        stockValorizado: 0,
        capacitacionAcum: 0,
        idAcumulado: 0,
        empleados: 0,
        prestamosBcoA: 0,
        prestamosBcoB: 0,
        utilidadAcumulada: 0
      }
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
