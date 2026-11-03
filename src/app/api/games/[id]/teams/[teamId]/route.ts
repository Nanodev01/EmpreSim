import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, MINUTO, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';

type Params = { id: string; teamId: string };

async function equipoHumanoOnline(id: string, teamId: string) {
  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: { teams: { where: { id: teamId, esHumano: true } } }
  });
  if (!partida) throw noEncontrada();
  if (partida.dispositivos !== 'multiple') throw new ApiError(409, 'Esta acción es solo para partidas online');
  if (partida.estado !== 'en_curso') throw new ApiError(409, 'La partida ya finalizó');
  if (partida.teams.length === 0) throw new ApiError(404, 'Equipo no encontrado');
  return partida;
}

/** Libera el equipo de su navegador para que alguien lo retome con el código (por ejemplo, si cambió de dispositivo). */
export const PATCH = ruta<Params>({ bucket: 'escritura', max: 600, ventanaMs: MINUTO }, async (_req, { id, teamId }) => {
  await equipoHumanoOnline(id, teamId);
  await prisma.team.update({ where: { id: teamId }, data: { claveHash: null } });
  return NextResponse.json({ success: true });
});

/** Quita un equipo que todavía no compitió. */
export const DELETE = ruta<Params>({ bucket: 'escritura', max: 600, ventanaMs: MINUTO }, async (_req, { id, teamId }) => {
  const partida = await equipoHumanoOnline(id, teamId);
  if (partida.periodoActual > 0) {
    throw new ApiError(409, 'Un equipo solo se puede quitar antes de simular la primera ronda');
  }
  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ success: true });
});
