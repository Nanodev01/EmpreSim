import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SimuladorEmpresarial } from '@/lib/engine/simulator';
import { BotHeuristico, LLMBotAgent, PersonalidadBot } from '@/lib/engine/bots';
import { CasoSimulacion, CasoPeriodoConfig } from '@/lib/engine/cases';
import { DecisionesEquipo, EstadoAnteriorEquipo, NivelProduccion, ConfiguracionBancoYEntorno } from '@/lib/engine/types';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        teams: {
          include: {
            decisions: true
          }
        },
        rounds: {
          orderBy: { periodo: 'desc' }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    const periodoActual = game.periodoActual;
    if (periodoActual > 6) {
      return NextResponse.json({ error: 'La partida ya ha finalizado todas sus rondas (0 a 6)' }, { status: 400 });
    }

    // Configuración del caso para la ronda actual
    let caso: CasoSimulacion;
    try {
      caso = JSON.parse(game.configCasoJson);
    } catch {
      return NextResponse.json({ error: 'Error al parsear la configuración del caso' }, { status: 500 });
    }

    const pIdx = Math.min(6, Math.max(0, periodoActual));
    const configPeriodo: CasoPeriodoConfig = caso.periodos[pIdx] || caso.periodos[0];

    // Verificar o generar decisiones para cada equipo
    const equiposParaSimulacion: Array<{
      id: string;
      nombre: string;
      estado: EstadoAnteriorEquipo;
      decisiones: DecisionesEquipo;
      configBancos?: ConfiguracionBancoYEntorno;
    }> = [];

    // Calcular estadísticas de la ronda anterior para los bots
    let precioPromedioAnterior = 89;
    if (game.rounds.length > 0) {
      try {
        const lastRound = JSON.parse(game.rounds[0].resultadoJson);
        if (lastRound.precio_promedio) {
          precioPromedioAnterior = lastRound.precio_promedio;
        }
      } catch {}
    }

    for (const team of game.teams) {
      let decision = team.decisions.find(d => d.periodo === periodoActual);

      if (!decision && !team.esHumano) {
        // Es un bot de IA: generar decisión automáticamente
        const botCtx = {
          equipo_id: team.id,
          nombre: team.nombre,
          personalidad: (team.personalidad as PersonalidadBot) || 'equilibrado',
          estado: {
            planta: team.planta,
            capital: team.capital,
            efectivo: team.efectivo,
            stock_unidades: team.stockUnidades,
            stock_valorizado: team.stockValorizado,
            capacitacion_acumulada: team.capacitacionAcum,
            id_acumulado: team.idAcumulado,
            empleados: team.empleados,
            prestamos_bco_a: team.prestamosBcoA,
            prestamos_bco_b: team.prestamosBcoB,
            utilidad_acumulada: team.utilidadAcumulada,
            periodo: periodoActual
          },
          caso_config: configPeriodo,
          historial_mercado: {
            precio_promedio_anterior: precioPromedioAnterior,
            stock_anterior: team.stockUnidades
          }
        };

        const botRes = await LLMBotAgent.tomarDecision(botCtx);
        
        decision = await prisma.roundDecision.create({
          data: {
            teamId: team.id,
            periodo: periodoActual,
            precio: botRes.decisiones.precio,
            marketing: botRes.decisiones.marketing,
            invDes: botRes.decisiones.inv_des,
            capacitacion: botRes.decisiones.capacitacion,
            nivelProd: botRes.decisiones.nivel_prod,
            amplPlanta: botRes.decisiones.ampl_planta,
            pedPrestA: botRes.decisiones.ped_prest_a,
            devPrestA: botRes.decisiones.dev_prest_a,
            pedPrestB: botRes.decisiones.ped_prest_b,
            devPrestB: botRes.decisiones.dev_prest_b,
            razonamiento: botRes.razonamiento_estrategico
          }
        });
      }

      if (!decision && team.esHumano) {
        return NextResponse.json({
          error: `El equipo humano "${team.nombre}" aún no ha cargado sus decisiones para el período ${periodoActual}`
        }, { status: 400 });
      }

      const decEquipo: DecisionesEquipo = {
        precio: decision!.precio,
        marketing: decision!.marketing,
        inv_des: decision!.invDes,
        capacitacion: decision!.capacitacion,
        nivel_prod: decision!.nivelProd as NivelProduccion,
        ampl_planta: decision!.amplPlanta,
        ped_prest_a: decision!.pedPrestA,
        dev_prest_a: decision!.devPrestA,
        ped_prest_b: decision!.pedPrestB,
        dev_prest_b: decision!.devPrestB
      };

      const estEquipo: EstadoAnteriorEquipo = {
        planta: team.planta,
        capital: team.capital,
        efectivo: team.efectivo,
        stock_unidades: team.stockUnidades,
        stock_valorizado: team.stockValorizado,
        capacitacion_acumulada: team.capacitacionAcum,
        id_acumulado: team.idAcumulado,
        empleados: team.empleados,
        prestamos_bco_a: team.prestamosBcoA,
        prestamos_bco_b: team.prestamosBcoB,
        utilidad_acumulada: team.utilidadAcumulada,
        periodo: periodoActual
      };

      equiposParaSimulacion.push({
        id: team.id,
        nombre: team.nombre,
        estado: estEquipo,
        decisiones: decEquipo,
        configBancos: configPeriodo.config_bancos
      });
    }

    // Ejecutar el motor de mercado de TypeScript
    const resultadoRonda = SimuladorEmpresarial.simularRondaMercado(
      equiposParaSimulacion,
      periodoActual,
      configPeriodo.parametros_demanda
    );

    // Persistir resultados en una transacción de base de datos
    await prisma.$transaction(async (tx) => {
      // 1. Guardar el snapshot de la ronda
      await tx.roundReport.upsert({
        where: {
          gameId_periodo: {
            gameId: game.id,
            periodo: periodoActual
          }
        },
        update: {
          resultadoJson: JSON.stringify(resultadoRonda)
        },
        create: {
          gameId: game.id,
          periodo: periodoActual,
          resultadoJson: JSON.stringify(resultadoRonda)
        }
      });

      // 2. Actualizar el estado financiero acumulado de cada equipo
      for (const eq of equiposParaSimulacion) {
        const res = resultadoRonda.resultados_equipos[eq.id];
        await tx.team.update({
          where: { id: eq.id },
          data: {
            planta: res.proximo_periodo.planta,
            efectivo: res.balance.efectivo,
            stockUnidades: res.reporte_comercial.stock_unidades,
            stockValorizado: res.balance.stock_valorizado,
            capacitacionAcum: res.proximo_periodo.capacitacion_acumulada,
            idAcumulado: res.proximo_periodo.id_acumulado,
            empleados: res.reporte_produccion.empleados,
            prestamosBcoA: res.reporte_creditos.prestamos_a,
            prestamosBcoB: res.reporte_creditos.prestamos_b,
            utilidadAcumulada: res.balance.util_acumulada
          }
        });
      }

      // 3. Avanzar el período de juego
      const proximoPeriodo = periodoActual + 1;
      await tx.game.update({
        where: { id: game.id },
        data: {
          periodoActual: proximoPeriodo,
          estado: proximoPeriodo > 6 ? 'finalizada' : 'en_curso'
        }
      });
    });

    return NextResponse.json({
      success: true,
      periodoSimulado: periodoActual,
      proximoPeriodo: periodoActual + 1,
      resultado: resultadoRonda
    });
  } catch (error: any) {
    console.error('Error al simular ronda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
