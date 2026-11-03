import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BusinessCoachAI, CoachContextoEquipo } from '@/lib/ai/coach';
import { ResultadoRondaMercado } from '@/lib/engine/types';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const { teamId, apiKey, provider, model } = body;

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        teams: {
          include: {
            decisions: {
              orderBy: { periodo: 'asc' }
            }
          }
        },
        rounds: {
          orderBy: { periodo: 'asc' }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    // Identificar el equipo objetivo
    const targetTeam = teamId 
      ? game.teams.find(t => t.id === teamId)
      : (game.teams.find(t => t.esHumano) || game.teams[0]);

    if (!targetTeam) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Extraer competidores
    const competidores = game.teams
      .filter(t => t.id !== targetTeam.id)
      .map(t => ({
        id: t.id,
        nombre: t.nombre,
        utilidadAcumulada: t.utilidadAcumulada,
        esHumano: t.esHumano
      }));

    // Extraer decisiones del equipo ordenadas por período
    const decisionesPorPeriodo = targetTeam.decisions.map(d => ({
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
    }));

    // Extraer resultados ronda a ronda
    const resultadosPorPeriodo = game.rounds.map(round => {
      let resultadoEquipo = undefined;
      let precioPromedioMercado = 89;
      let posicionRanking = 1;
      let totalEquipos = game.teams.length;

      try {
        const snap: ResultadoRondaMercado = JSON.parse(round.resultadoJson);
        resultadoEquipo = snap.resultados_equipos[targetTeam.id];
        precioPromedioMercado = snap.precio_promedio || 89;

        const rankItem = snap.ranking.find(r => r.equipo_id === targetTeam.id);
        if (rankItem) {
          posicionRanking = rankItem.posicion;
        }
        totalEquipos = snap.ranking.length;
      } catch (err) {
        console.error('Error parseando round report:', err);
      }

      return {
        periodo: round.periodo,
        resultadoEquipo,
        precioPromedioMercado,
        posicionRanking,
        totalEquipos
      };
    });

    const contexto: CoachContextoEquipo = {
      equipo: {
        id: targetTeam.id,
        nombre: targetTeam.nombre,
        esHumano: targetTeam.esHumano,
        utilidadAcumulada: targetTeam.utilidadAcumulada,
        efectivo: targetTeam.efectivo,
        planta: targetTeam.planta,
        stockUnidades: targetTeam.stockUnidades,
        capacitacionAcum: targetTeam.capacitacionAcum,
        idAcumulado: targetTeam.idAcumulado,
        prestamosBcoA: targetTeam.prestamosBcoA,
        prestamosBcoB: targetTeam.prestamosBcoB
      },
      competidores,
      decisionesPorPeriodo,
      resultadosPorPeriodo
    };

    // Generar la auditoría con Gemini o fallback heurístico
    const feedback = await BusinessCoachAI.generarFeedback(contexto, {
      apiKey,
      provider,
      model
    });

    // Persistir el feedback generado en la base de datos
    await prisma.team.update({
      where: { id: targetTeam.id },
      data: {
        feedbackJson: JSON.stringify(feedback)
      }
    });

    return NextResponse.json(feedback);
  } catch (error: any) {
    console.error('Error en ruta coach:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
