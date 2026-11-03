import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, HORA, leerJson, ruta } from '@/lib/api/http';
import { obtenerOCrearHashClave } from '@/lib/api/clave-navegador';
import { generarCodigoCoordinador, normalizarCodigoCoordinador } from '@/lib/api/codigo-union';
import { esquemaRecuperar } from '@/lib/api/esquemas';

const codigoNoValido = () => new ApiError(404, 'Ese código no corresponde a ninguna partida');

/**
 * Traspasa la coordinación de una partida al navegador que presenta el código secreto.
 * El código cambia con cada traspaso, así el anterior deja de servir si alguien más lo vio.
 */
export const POST = ruta<object>({ bucket: 'recuperar', max: 30, ventanaMs: HORA }, async (req) => {
  const { codigo } = esquemaRecuperar.parse(await leerJson(req));
  const codigoCoordinador = normalizarCodigoCoordinador(codigo);
  if (!codigoCoordinador) throw codigoNoValido();

  const partida = await prisma.game.findUnique({
    where: { codigoCoordinador },
    select: { id: true, claveHash: true }
  });
  if (!partida) throw codigoNoValido();

  const claveHash = await obtenerOCrearHashClave(req);
  if (partida.claveHash === claveHash) return NextResponse.json({ gameId: partida.id });

  const { count } = await prisma.game.updateMany({
    where: { id: partida.id, codigoCoordinador },
    data: { claveHash, codigoCoordinador: generarCodigoCoordinador() }
  });
  if (count === 0) throw codigoNoValido();
  return NextResponse.json({ gameId: partida.id });
});
