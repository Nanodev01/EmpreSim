import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MINUTO, noEncontrada, ruta } from '@/lib/api/http';
import { accesoParticipante } from '@/lib/api/clave-navegador';

/** Consulta liviana para las pantallas online: solo se recarga la partida si cambió la huella. */
export const GET = ruta<{ id: string }>({ bucket: 'sondeo', max: 1500, ventanaMs: MINUTO }, async (_req, { id }) => {
  const { where } = await accesoParticipante(id);
  const partida = await prisma.game.findFirst({
    where,
    select: {
      periodoActual: true,
      estado: true,
      updatedAt: true,
      teams: {
        select: {
          claveHash: true,
          decisions: { select: { periodo: true }, orderBy: { periodo: 'desc' }, take: 1 }
        }
      }
    }
  });
  if (!partida) throw noEncontrada();

  const guardados = partida.teams.filter(t => t.decisions[0]?.periodo === partida.periodoActual).length;
  const conectados = partida.teams.filter(t => t.claveHash).length;
  return NextResponse.json({
    huella: [partida.periodoActual, partida.estado, partida.updatedAt.getTime(), partida.teams.length, guardados, conectados].join('|')
  });
});
