import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CasoPeriodoConfig } from '@/lib/engine/cases';
import { ApiError, MINUTO, leerJson, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';
import { PLANTA_MAXIMA, esquemaCaso, esquemaDecision } from '@/lib/api/esquemas';
import { ORDEN_EQUIPOS, equipoEnTurno } from '@/lib/api/partida-visible';

export const POST = ruta<{ id: string }>({ bucket: 'escritura', max: 120, ventanaMs: MINUTO }, async (req, { id }) => {
  const { teamId, periodo, ...valores } = esquemaDecision.parse(await leerJson(req));

  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: { teams: { orderBy: ORDEN_EQUIPOS, include: { decisions: true } } }
  });
  if (!partida) throw noEncontrada();
  if (partida.estado !== 'en_curso') throw new ApiError(409, 'La partida ya finalizó');
  if (periodo !== partida.periodoActual) throw new ApiError(409, 'El período ya no está disponible. Recargá la página.');

  const equipo = partida.teams.find(t => t.id === teamId);
  if (!equipo || !equipo.esHumano) throw new ApiError(404, 'Equipo no encontrado');
  if (equipoEnTurno(partida.teams, periodo)?.id !== teamId) {
    throw new ApiError(409, 'No es el turno de este equipo o ya guardó sus decisiones');
  }

  const caso = esquemaCaso.parse(JSON.parse(partida.configCasoJson));
  const bancos = (caso.periodos[periodo] as unknown as CasoPeriodoConfig).config_bancos;

  if (equipo.planta + valores.amplPlanta > PLANTA_MAXIMA) {
    throw new ApiError(400, `La planta no puede superar $${PLANTA_MAXIMA}`);
  }
  if (valores.devPrestA > equipo.prestamosBcoA) throw new ApiError(400, 'No podés devolver más de lo que debés al Banco A');
  if (valores.devPrestB > equipo.prestamosBcoB) throw new ApiError(400, 'No podés devolver más de lo que debés al Banco B');
  if (equipo.prestamosBcoA + valores.pedPrestA - valores.devPrestA > bancos.max_cred_a) {
    throw new ApiError(400, `El préstamo supera el cupo del Banco A ($${bancos.max_cred_a})`);
  }
  if (equipo.prestamosBcoB + valores.pedPrestB - valores.devPrestB > bancos.max_cred_b) {
    throw new ApiError(400, `El préstamo supera el cupo del Banco B ($${bancos.max_cred_b})`);
  }

  await prisma.roundDecision.create({ data: { teamId, periodo, ...valores } });

  // No se devuelven los valores: la pantalla pasa enseguida al equipo siguiente.
  return NextResponse.json({ success: true }, { status: 201 });
});
