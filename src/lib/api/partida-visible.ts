import type { Game, RoundDecision, RoundReport, Team } from '@prisma/client';

type EquipoConDecisiones = Team & { decisions: RoundDecision[] };
type PartidaCompleta = Game & { teams: EquipoConDecisiones[]; rounds: RoundReport[] };

/** Orden único de turnos: tanto el servidor como la pantalla usan el mismo. */
export const ORDEN_EQUIPOS = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];

export function equipoEnTurno(teams: EquipoConDecisiones[], periodo: number) {
  return teams.find(t => t.esHumano && !t.decisions.some(d => d.periodo === periodo)) ?? null;
}

/**
 * Lo que el navegador puede conocer de una partida, para que un equipo no vea lo que cargó otro:
 * - Las decisiones de la ronda en curso nunca salen del servidor; solo se informa quién ya guardó.
 * - En modo competitivo, hasta el final solo se ve la situación del equipo en turno y no hay reportes.
 * - En modo práctica se ven las rondas ya simuladas, porque sus resultados ya se publicaron.
 */
export function partidaVisible(partida: PartidaCompleta) {
  const { claveHash: _claveHash, ...datos } = partida;
  const finalizada = partida.estado === 'finalizada';
  const oculto = partida.modoCompetitivo && !finalizada;
  const enTurno = equipoEnTurno(partida.teams, partida.periodoActual);

  return {
    ...datos,
    rounds: oculto ? [] : partida.rounds,
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
