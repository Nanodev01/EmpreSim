import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, MINUTO, leerJson, noEncontrada, ruta } from '@/lib/api/http';
import { accesoParticipante, filtroPartidaPropia } from '@/lib/api/clave-navegador';
import { esquemaActualizarPartida, esquemaCaso } from '@/lib/api/esquemas';
import { ORDEN_EQUIPOS, partidaVisible, visorDe } from '@/lib/api/partida-visible';

type Params = { id: string };

export const GET = ruta<Params>({ bucket: 'lectura', max: 1500, ventanaMs: MINUTO }, async (_req, { id }) => {
  const { claveHash, where } = await accesoParticipante(id);
  const partida = await prisma.game.findFirst({
    where,
    include: {
      teams: { orderBy: ORDEN_EQUIPOS, include: { decisions: { orderBy: { periodo: 'desc' } } } },
      rounds: { orderBy: { periodo: 'desc' } }
    }
  });
  if (!partida) throw noEncontrada();
  return NextResponse.json(partidaVisible(partida, visorDe(partida, claveHash)));
});

export const PUT = ruta<Params>({ bucket: 'escritura', max: 600, ventanaMs: MINUTO }, async (req, { id }) => {
  const datos = esquemaActualizarPartida.parse(await leerJson(req));
  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: { teams: { select: { decisions: { select: { id: true }, take: 1 } } } }
  });
  if (!partida) throw noEncontrada();
  if (partida.estado === 'finalizada') {
    throw new ApiError(409, 'La partida ya finalizó y no se puede modificar');
  }

  const cambios: { configCasoJson?: string; modoCompetitivo?: boolean } = {};

  if (datos.modoCompetitivo !== undefined && datos.modoCompetitivo !== partida.modoCompetitivo) {
    // Pasar de competitivo a práctica a mitad de partida revelaría los resultados ocultos.
    const empezada = partida.periodoActual > 0 || partida.teams.some(t => t.decisions.length > 0);
    if (empezada) {
      throw new ApiError(409, 'El modo solo se puede cambiar antes de que algún equipo cargue sus decisiones');
    }
    cambios.modoCompetitivo = datos.modoCompetitivo;
  }

  if (datos.configCasoJson !== undefined) {
    let crudo: unknown;
    try {
      crudo = JSON.parse(datos.configCasoJson);
    } catch {
      throw new ApiError(400, 'La configuración del caso no es JSON válido');
    }
    const nuevo = esquemaCaso.parse(crudo);
    // Las rondas ya simuladas no se reescriben: solo cambian la actual y las siguientes.
    const actual = esquemaCaso.parse(JSON.parse(partida.configCasoJson));
    nuevo.periodos = nuevo.periodos.map((periodo, i) => (i < partida.periodoActual ? actual.periodos[i] : periodo));
    cambios.configCasoJson = JSON.stringify(nuevo);
  }

  await prisma.game.update({ where: { id }, data: cambios });
  return NextResponse.json({ success: true });
});

export const DELETE = ruta<Params>({ bucket: 'escritura', max: 600, ventanaMs: MINUTO }, async (_req, { id }) => {
  const { count } = await prisma.game.deleteMany({ where: await filtroPartidaPropia(id) });
  if (count === 0) throw noEncontrada();
  return NextResponse.json({ success: true });
});
