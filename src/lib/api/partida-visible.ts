import type { Game, RoundDecision, RoundReport, Team } from '@prisma/client';

type EquipoConDecisiones = Team & { decisions: RoundDecision[] };
type PartidaCompleta = Game & { teams: EquipoConDecisiones[]; rounds: RoundReport[] };

export interface Visor {
  esCoordinador: boolean;
  miEquipoId: string | null;
}

/** Orden único de turnos: tanto el servidor como la pantalla usan el mismo. */
export const ORDEN_EQUIPOS = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];

export function equipoEnTurno(teams: EquipoConDecisiones[], periodo: number) {
  return teams.find(t => t.esHumano && !t.decisions.some(d => d.periodo === periodo)) ?? null;
}

export function visorDe(partida: Pick<PartidaCompleta, 'claveHash' | 'teams'>, claveHash: string | null): Visor {
  return {
    esCoordinador: Boolean(claveHash) && partida.claveHash === claveHash,
    miEquipoId: claveHash ? partida.teams.find(t => t.claveHash === claveHash)?.id ?? null : null
  };
}

/** Ranking sin los valores que cargó cada equipo: se publica entre rondas en modo competitivo. */
function rondaSoloRanking(ronda: RoundReport, miEquipoId: string | null): RoundReport {
  const completa = JSON.parse(ronda.resultadoJson);
  const miReporte = miEquipoId ? completa.resultados_equipos[miEquipoId] : undefined;
  return {
    ...ronda,
    resultadoJson: JSON.stringify({
      periodo: completa.periodo,
      total_mercado_unidades: completa.total_mercado_unidades,
      resultados_equipos: miReporte ? { [miEquipoId as string]: miReporte } : {},
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
 * Lo que cada navegador puede conocer de una partida, para que un equipo no vea lo que cargó otro:
 * - Las decisiones de la ronda en curso de otro equipo nunca salen del servidor; solo se informa quién guardó.
 * - En modo competitivo, hasta el final se ve el ranking de cada ronda y la situación propia (o la del
 *   equipo en turno en una sola computadora), pero no precios, marketing ni reportes de los demás.
 * - En modo práctica se ven las rondas ya simuladas, porque sus resultados ya se publicaron.
 */
export function partidaVisible(partida: PartidaCompleta, visor: Visor) {
  const { claveHash: _claveHash, codigoCoordinador, ...datos } = partida;
  const finalizada = partida.estado === 'finalizada';
  const oculto = partida.modoCompetitivo && !finalizada;
  const online = partida.dispositivos === 'multiple';
  const propio = online ? visor.miEquipoId : null;
  const visibleEnCompetitivo = online ? propio : equipoEnTurno(partida.teams, partida.periodoActual)?.id ?? null;

  return {
    ...datos,
    visor,
    // Da control total de la partida: solo lo recibe quien ya la coordina.
    ...(visor.esCoordinador ? { codigoCoordinador } : {}),
    rounds: oculto ? partida.rounds.map(r => rondaSoloRanking(r, propio)) : partida.rounds,
    teams: partida.teams.map(({ claveHash: claveEquipo, ...equipo }) => {
      const yaGuardo = equipo.decisions.some(d => d.periodo === partida.periodoActual);
      const conectado = Boolean(claveEquipo);
      const esPropio = equipo.id === propio;

      if (oculto && equipo.id !== visibleEnCompetitivo) {
        return {
          id: equipo.id,
          gameId: equipo.gameId,
          nombre: equipo.nombre,
          esHumano: equipo.esHumano,
          personalidad: equipo.personalidad,
          yaGuardo,
          conectado,
          decisions: []
        };
      }

      const devolucionVisible = finalizada || (!oculto && (!online || esPropio || visor.esCoordinador));
      let decisions: RoundDecision[];
      if (esPropio) {
        decisions = equipo.decisions;
      } else if (oculto) {
        decisions = [];
      } else {
        decisions = equipo.decisions.filter(d => d.periodo < partida.periodoActual);
      }

      return {
        ...equipo,
        yaGuardo,
        conectado,
        feedbackJson: devolucionVisible || esPropio ? equipo.feedbackJson : null,
        decisions
      };
    })
  };
}
