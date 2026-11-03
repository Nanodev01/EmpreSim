import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SimuladorEmpresarial } from '@/lib/engine/simulator';
import { BotDecisionOutput, LLMBotAgent, PersonalidadBot } from '@/lib/engine/bots';
import { CasoSimulacion } from '@/lib/engine/cases';
import { ConfiguracionBancoYEntorno, DecisionesEquipo, EstadoAnteriorEquipo, NivelProduccion } from '@/lib/engine/types';
import { ApiError, MINUTO, leerJson, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';
import { PLANTA_MAXIMA, esquemaCaso, esquemaSimular } from '@/lib/api/esquemas';
import { ORDEN_EQUIPOS } from '@/lib/api/partida-visible';

const ULTIMO_PERIODO = 6;

/** Aplica a los bots los mismos límites que a los equipos: un LLM puede devolver cualquier valor. */
function limitarDecisionBot(
  { decisiones: d }: BotDecisionOutput,
  estado: EstadoAnteriorEquipo,
  bancos: ConfiguracionBancoYEntorno
): DecisionesEquipo {
  const devA = Math.min(d.dev_prest_a, estado.prestamos_bco_a ?? 0);
  const devB = Math.min(d.dev_prest_b, estado.prestamos_bco_b ?? 0);
  const cupoA = Math.max(0, bancos.max_cred_a - (estado.prestamos_bco_a ?? 0) + devA);
  const cupoB = Math.max(0, bancos.max_cred_b - (estado.prestamos_bco_b ?? 0) + devB);
  return {
    ...d,
    ampl_planta: Math.min(d.ampl_planta, Math.max(0, PLANTA_MAXIMA - estado.planta)),
    dev_prest_a: devA,
    dev_prest_b: devB,
    ped_prest_a: Math.min(d.ped_prest_a, cupoA),
    ped_prest_b: Math.min(d.ped_prest_b, cupoB)
  };
}

/** Equipo ausente al cerrar el ciclo a la fuerza: mantiene su último precio, sin producir ni invertir. */
function decisionPorOmision(ultimoPrecio: number | undefined): DecisionesEquipo {
  return {
    precio: ultimoPrecio ?? 89,
    marketing: 0,
    inv_des: 0,
    capacitacion: 0,
    nivel_prod: 0,
    ampl_planta: 0,
    ped_prest_a: 0,
    dev_prest_a: 0,
    ped_prest_b: 0,
    dev_prest_b: 0
  };
}

export const POST = ruta<{ id: string }>({ bucket: 'simular', max: 30, ventanaMs: MINUTO }, async (req, { id }) => {
  const { forzar } = esquemaSimular.parse(await leerJson(req));
  const partida = await prisma.game.findFirst({
    where: await filtroPartidaPropia(id),
    include: {
      teams: { orderBy: ORDEN_EQUIPOS, include: { decisions: true } },
      rounds: { orderBy: { periodo: 'desc' }, take: 1 }
    }
  });
  if (!partida) throw noEncontrada();
  if (partida.estado !== 'en_curso' || partida.periodoActual > ULTIMO_PERIODO) {
    throw new ApiError(409, 'La partida ya finalizó');
  }

  const periodo = partida.periodoActual;
  const online = partida.dispositivos === 'multiple';
  if (!partida.teams.some(t => t.esHumano)) {
    throw new ApiError(409, 'Todavía no se unió ningún equipo');
  }
  const pendiente = partida.teams.find(t => t.esHumano && !t.decisions.some(d => d.periodo === periodo));
  if (pendiente && !(online && forzar)) {
    throw new ApiError(409, `Falta que "${pendiente.nombre}" guarde sus decisiones del período ${periodo}`);
  }

  const caso = esquemaCaso.parse(JSON.parse(partida.configCasoJson)) as unknown as CasoSimulacion;
  const configPeriodo = caso.periodos[periodo];

  let precioPromedioAnterior = 89;
  if (partida.rounds[0]) {
    precioPromedioAnterior = JSON.parse(partida.rounds[0].resultadoJson).precio_promedio || 89;
  }

  // Los bots pueden demorar por el LLM: se resuelven antes de abrir la transacción.
  const equipos = await Promise.all(partida.teams.map(async (equipo) => {
    const estado: EstadoAnteriorEquipo = {
      planta: equipo.planta,
      capital: equipo.capital,
      efectivo: equipo.efectivo,
      stock_unidades: equipo.stockUnidades,
      stock_valorizado: equipo.stockValorizado,
      capacitacion_acumulada: equipo.capacitacionAcum,
      id_acumulado: equipo.idAcumulado,
      empleados: equipo.empleados,
      prestamos_bco_a: equipo.prestamosBcoA,
      prestamos_bco_b: equipo.prestamosBcoB,
      utilidad_acumulada: equipo.utilidadAcumulada,
      periodo
    };

    const guardada = equipo.decisions.find(d => d.periodo === periodo);
    if (guardada) {
      const decisiones: DecisionesEquipo = {
        precio: guardada.precio,
        marketing: guardada.marketing,
        inv_des: guardada.invDes,
        capacitacion: guardada.capacitacion,
        nivel_prod: guardada.nivelProd as NivelProduccion,
        ampl_planta: guardada.amplPlanta,
        ped_prest_a: guardada.pedPrestA,
        dev_prest_a: guardada.devPrestA,
        ped_prest_b: guardada.pedPrestB,
        dev_prest_b: guardada.devPrestB
      };
      return { id: equipo.id, nombre: equipo.nombre, estado, decisiones, razonamiento: null, nueva: false };
    }

    if (equipo.esHumano) {
      const ultimaDecision = [...equipo.decisions].sort((a, b) => b.periodo - a.periodo)[0];
      return {
        id: equipo.id,
        nombre: equipo.nombre,
        estado,
        decisiones: decisionPorOmision(ultimaDecision?.precio),
        razonamiento: 'El equipo no cargó sus decisiones y el coordinador cerró el ciclo.',
        nueva: true
      };
    }

    const salida = await LLMBotAgent.tomarDecision({
      equipo_id: equipo.id,
      nombre: equipo.nombre,
      personalidad: (equipo.personalidad as PersonalidadBot) || 'equilibrado',
      estado,
      caso_config: configPeriodo,
      historial_mercado: { precio_promedio_anterior: precioPromedioAnterior, stock_anterior: equipo.stockUnidades }
    });
    return {
      id: equipo.id,
      nombre: equipo.nombre,
      estado,
      decisiones: limitarDecisionBot(salida, estado, configPeriodo.config_bancos),
      razonamiento: salida.razonamiento_estrategico,
      nueva: true
    };
  }));

  const resultado = SimuladorEmpresarial.simularRondaMercado(
    equipos.map(e => ({ ...e, configBancos: configPeriodo.config_bancos })),
    periodo,
    configPeriodo.parametros_demanda
  );

  const proximoPeriodo = periodo + 1;

  await prisma.$transaction(async (tx) => {
    // Va primero: si dos pedidos simulan a la vez, solo uno avanza la ronda y el otro no escribe nada.
    const { count } = await tx.game.updateMany({
      where: { id: partida.id, periodoActual: periodo, estado: 'en_curso' },
      data: {
        periodoActual: proximoPeriodo,
        estado: proximoPeriodo > ULTIMO_PERIODO ? 'finalizada' : 'en_curso'
      }
    });
    if (count === 0) throw new ApiError(409, 'Esta ronda ya fue simulada');

    await tx.roundReport.create({
      data: { gameId: partida.id, periodo, resultadoJson: JSON.stringify(resultado) }
    });

    for (const equipo of equipos) {
      if (equipo.nueva) {
        const d = equipo.decisiones;
        await tx.roundDecision.create({
          data: {
            teamId: equipo.id,
            periodo,
            precio: d.precio,
            marketing: d.marketing,
            invDes: d.inv_des,
            capacitacion: d.capacitacion,
            nivelProd: d.nivel_prod,
            amplPlanta: d.ampl_planta,
            pedPrestA: d.ped_prest_a,
            devPrestA: d.dev_prest_a,
            pedPrestB: d.ped_prest_b,
            devPrestB: d.dev_prest_b,
            razonamiento: equipo.razonamiento
          }
        });
      }

      const res = resultado.resultados_equipos[equipo.id];
      await tx.team.update({
        where: { id: equipo.id },
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
  });

  // El resultado se lee con GET, que aplica las reglas de qué puede verse en cada modo.
  return NextResponse.json({ success: true, periodoSimulado: periodo, proximoPeriodo });
});
