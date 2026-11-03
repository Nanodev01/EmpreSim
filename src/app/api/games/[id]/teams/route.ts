import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, MINUTO, leerJson, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';
import { MAX_EQUIPOS, esquemaNuevoEquipo } from '@/lib/api/esquemas';

export const POST = ruta<{ id: string }>({ bucket: 'escritura', max: 600, ventanaMs: MINUTO }, async (req, { id }) => {
  const { nombre } = esquemaNuevoEquipo.parse(await leerJson(req));

  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: { _count: { select: { teams: true } } }
  });
  if (!partida) throw noEncontrada();
  if (partida.estado !== 'en_curso') throw new ApiError(409, 'La partida ya finalizó');
  if (partida.dispositivos === 'multiple') {
    throw new ApiError(409, 'En esta partida cada equipo se suma con el código desde su dispositivo');
  }
  if (partida.periodoActual > 0) {
    throw new ApiError(409, 'Los equipos solo se pueden sumar antes de simular la primera ronda');
  }
  if (partida._count.teams >= MAX_EQUIPOS) throw new ApiError(400, `El máximo es ${MAX_EQUIPOS} equipos`);

  const equipo = await prisma.team.create({
    data: { gameId: partida.id, nombre, esHumano: true },
    select: { id: true, nombre: true }
  });
  return NextResponse.json(equipo, { status: 201 });
});
