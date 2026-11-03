import type { Game, RoundDecision, RoundReport, Team } from '@prisma/client';

type EquipoConDecisiones = Team & { decisions: RoundDecision[] };
type PartidaCompleta = Game & { teams: EquipoConDecisiones[]; rounds: RoundReport[] };

/** Orden único de turnos: tanto el servidor como la pantalla usan el mismo. */
export const ORDEN_EQUIPOS = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];

export function equipoEnTurno(teams: EquipoConDecisiones[], periodo: number) {
  return teams.find(t => t.esHumano && !t.decisions.some(d => d.periodo === periodo)) ?? null;
}

/** Ranking sin los valores que cargó cada equipo: se publica entre rondas en modo competitivo. */
function rondaSoloRanking(ronda: RoundReport): RoundReport {
  const completa = JSON.parse(ronda.resultadoJson);
  return {
    ...ronda,
    resultadoJson: JSON.stringify({
      periodo: completa.periodo,
      total_mercado_unidades: completa.total_mercado_unidades,
      resultados_equipos: {},
      ranking: completa.ranking.map((item: any) => ({
        posicion: item.posicion,
        equipo_id: item.equipo_id,
        nombre: item.nombre,
        ventas_unidades: item.ventas_unidades,
        cuota_mercado_pct: item.cuota_mercado_pct,
        utilidad_periodo: item.utilidad_periodo,
        utilidad_acumulada: item.utilidad_acumulada
      }))
    })
  };
}

/**
 * Lo que el navegador puede conocer de una partida, para que un equipo no vea lo que cargó otro:
 * - Las decisiones de la ronda en curso nunca salen del servidor; solo se informa quién ya guardó.
 * - En modo competitivo, hasta el final se ve el ranking de cada ronda y la situación del equipo
 *   en turno, pero no precios, marketing ni reportes de los demás.
 * - En modo práctica se ven las rondas ya simuladas, porque sus resultados ya se publicaron.
 */
export function partidaVisible(partida: PartidaCompleta) {
  const { claveHash: _claveHash, ...datos } = partida;
  const finalizada = partida.estado === 'finalizada';
  const oculto = partida.modoCompetitivo && !finalizada;
  const enTurno = equipoEnTurno(partida.teams, partida.periodoActual);

  return {
    ...datos,
    rounds: oculto ? partida.rounds.map(rondaSoloRanking) : partida.rounds,
    teams: partida.teams.map(equipo => {
      const yaGuardo = equipo.decisions.some(d => d.periodo === partida.periodoActual);
      if (oculto && equipo.id !== enTurno?.id) {
        return {
          id: equipo.id,
          gameId: equipo.gameId,
          nombre: equipo.nombre,
          esHumano: equipo.esHumano,
          personalidad: equipo.personalidad,
          yaGuardo,
          decisions: []
        };
      }
      return {
        ...equipo,
        yaGuardo,
        feedbackJson: oculto ? null : equipo.feedbackJson,
        decisions: oculto ? [] : equipo.decisions.filter(d => d.periodo < partida.periodoActual)
      };
    })
  };
}
