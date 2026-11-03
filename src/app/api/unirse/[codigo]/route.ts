import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, MINUTO, leerJson, ruta } from '@/lib/api/http';
import { hashClaveActual, obtenerOCrearHashClave } from '@/lib/api/clave-navegador';
import { normalizarCodigo } from '@/lib/api/codigo-union';
import { MAX_EQUIPOS, esquemaUnirse } from '@/lib/api/esquemas';
import { ORDEN_EQUIPOS } from '@/lib/api/partida-visible';

const LIMITE = { bucket: 'unirse', max: 120, ventanaMs: MINUTO };

const codigoNoValido = () => new ApiError(404, 'No encontramos una partida con ese código');

async function buscarPartida(codigo: string) {
  const partida = await prisma.game.findUnique({
    where: { codigo: normalizarCodigo(codigo) },
    include: { teams: { orderBy: ORDEN_EQUIPOS, select: { id: true, nombre: true, esHumano: true, claveHash: true } } }
  });
  if (!partida) throw codigoNoValido();
  return partida;
}

export const GET = ruta<{ codigo: string }>(LIMITE, async (_req, { codigo }) => {
  const partida = await buscarPartida(codigo);
  const claveHash = await hashClaveActual();
  const miEquipo = claveHash ? partida.teams.find(t => t.claveHash === claveHash) : undefined;
  const enCurso = partida.estado === 'en_curso';

  return NextResponse.json({
    id: partida.id,
    nombre: partida.nombre,
    estado: partida.estado,
    periodoActual: partida.periodoActual,
    modoCompetitivo: partida.modoCompetitivo,
    esCoordinador: Boolean(claveHash) && partida.claveHash === claveHash,
    miEquipo: miEquipo?.nombre ?? null,
    equiposLibres: enCurso
      ? partida.teams.filter(t => t.esHumano && !t.claveHash).map(t => ({ id: t.id, nombre: t.nombre }))
      : [],
    puedeCrearEquipo: enCurso && partida.periodoActual === 0 && partida.teams.length < MAX_EQUIPOS
  });
});

export const POST = ruta<{ codigo: string }>(LIMITE, async (req, { codigo }) => {
  const datos = esquemaUnirse.parse(await leerJson(req));
  const partida = await buscarPartida(codigo);
  if (partida.estado !== 'en_curso') throw new ApiError(409, 'La partida ya finalizó');

  const claveHash = await obtenerOCrearHashClave(req);
  if (partida.teams.some(t => t.claveHash === claveHash)) {
    return NextResponse.json({ gameId: partida.id });
  }

  if ('teamId' in datos) {
    const { count } = await prisma.team.updateMany({
      where: { id: datos.teamId, gameId: partida.id, esHumano: true, claveHash: null },
      data: { claveHash }
    });
    if (count === 0) throw new ApiError(409, 'Ese equipo ya no está disponible');
    return NextResponse.json({ gameId: partida.id });
  }

  if (partida.periodoActual > 0) {
    throw new ApiError(409, 'La partida ya empezó: solo se puede retomar un equipo liberado por el coordinador');
  }
  if (partida.teams.length >= MAX_EQUIPOS) throw new ApiError(409, `La partida ya tiene ${MAX_EQUIPOS} equipos`);

  const nombreNuevo = datos.nombre.toLocaleLowerCase('es');
  if (partida.teams.some(t => t.nombre.toLocaleLowerCase('es') === nombreNuevo)) {
    throw new ApiError(409, 'Ya hay un equipo con ese nombre');
  }

  await prisma.team.create({
    data: { gameId: partida.id, nombre: datos.nombre, esHumano: true, claveHash }
  });
  return NextResponse.json({ gameId: partida.id }, { status: 201 });
});
