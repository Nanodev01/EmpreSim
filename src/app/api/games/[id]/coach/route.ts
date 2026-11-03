import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BusinessCoachAI, CoachContextoEquipo } from '@/lib/ai/coach';
import { ResultadoRondaMercado } from '@/lib/engine/types';
import { ApiError, HORA, leerJson, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';
import { esquemaCoach } from '@/lib/api/esquemas';
import { ORDEN_EQUIPOS } from '@/lib/api/partida-visible';

export const POST = ruta<{ id: string }>({ bucket: 'coach', max: 20, ventanaMs: HORA }, async (req, { id }) => {
  const { teamId } = esquemaCoach.parse(await leerJson(req));

  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: {
      teams: { orderBy: ORDEN_EQUIPOS, include: { decisions: { orderBy: { periodo: 'asc' } } } },
      rounds: { orderBy: { periodo: 'asc' } }
    }
  });
  if (!partida) throw noEncontrada();
  if (partida.modoCompetitivo && partida.estado !== 'finalizada') {
    throw new ApiError(409, 'En modo competitivo la devolución está disponible al finalizar la partida');
  }

  const equipo = teamId
    ? partida.teams.find(t => t.id === teamId)
    : partida.teams.find(t => t.esHumano) ?? partida.teams[0];
  if (!equipo) throw new ApiError(404, 'Equipo no encontrado');

  const contexto: CoachContextoEquipo = {
    equipo: {
      id: equipo.id,
      nombre: equipo.nombre,
      esHumano: equipo.esHumano,
      utilidadAcumulada: equipo.utilidadAcumulada,
      efectivo: equipo.efectivo,
      planta: equipo.planta,
      stockUnidades: equipo.stockUnidades,
      capacitacionAcum: equipo.capacitacionAcum,
      idAcumulado: equipo.idAcumulado,
      prestamosBcoA: equipo.prestamosBcoA,
      prestamosBcoB: equipo.prestamosBcoB
    },
    competidores: partida.teams
      .filter(t => t.id !== equipo.id)
      .map(t => ({ id: t.id, nombre: t.nombre, utilidadAcumulada: t.utilidadAcumulada, esHumano: t.esHumano })),
    // La ronda en curso queda afuera: la devolución no debe revelar valores todavía sin simular.
    decisionesPorPeriodo: equipo.decisions
      .filter(d => d.periodo < partida.periodoActual)
      .map(d => ({
        periodo: d.periodo,
        precio: d.precio,
        marketing: d.marketing,
        invDes: d.invDes,
        capacitacion: d.capacitacion,
        nivelProd: d.nivelProd,
        amplPlanta: d.amplPlanta,
        pedPrestA: d.pedPrestA,
        devPrestA: d.devPrestA,
        pedPrestB: d.pedPrestB,
        devPrestB: d.devPrestB
      })),
    resultadosPorPeriodo: partida.rounds.map(ronda => {
      const snapshot: ResultadoRondaMercado = JSON.parse(ronda.resultadoJson);
      return {
        periodo: ronda.periodo,
        resultadoEquipo: snapshot.resultados_equipos[equipo.id],
        precioPromedioMercado: snapshot.precio_promedio || 89,
        posicionRanking: snapshot.ranking.find(r => r.equipo_id === equipo.id)?.posicion ?? 1,
        totalEquipos: snapshot.ranking.length
      };
    })
  };

  const devolucion = await BusinessCoachAI.generarFeedback(contexto);

  await prisma.team.update({
    where: { id: equipo.id },
    data: { feedbackJson: JSON.stringify(devolucion) }
  });

  return NextResponse.json(devolucion);
});
