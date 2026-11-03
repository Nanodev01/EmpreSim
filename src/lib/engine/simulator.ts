/**
 * simulator.ts
 * Motor matemático de simulación empresarial en TypeScript.
 * Port de la lógica desensamblada de SimulacionDEMO.exe. Los costos salen de Planilla-de-Costos.xls,
 * por lo que los importes pueden diferir unos pocos dólares de los reportes del ejecutable.
 */

import matrizDemandaRaw from '@/data/matriz_demanda.json';
import matrizCostosRaw from '@/data/matriz_costos.json';

import {
  DecisionesEquipo,
  EstadoAnteriorEquipo,
  ConfiguracionBancoYEntorno,
  ResultadoSimulacionEquipo,
  ResultadoRondaMercado,
  ItemRankingMercado,
  NivelProduccion
} from './types';

// Convertir las matrices JSON a tipos indexados seguros
const matrizDemanda: Record<number, number[]> = matrizDemandaRaw as unknown as Record<number, number[]>;
const matrizCostos: Record<number, Record<number, Record<number, number>>> = matrizCostosRaw as unknown as Record<number, Record<number, Record<number, number>>>;

export interface ParametrosEscenarioPeriodo {
  modif_ord_pct: number;
  mult_mas: number;
  mult_menos: number;
  nro_inv_des: number;
}

/**
 * Escenarios clásicos extraídos de SimulacionDEMO.exe (0x4B14DC y 0x4B15EB).
 * Recordar que en el binario legacy original los nombres estaban invertidos respecto al efecto real:
 * - 'ALTA' corresponde al 55% inicial (usado en los ejemplos 1 a 8).
 * - 'BAJA' corresponde al 40% inicial.
 */
export const ESCENARIOS_ORIGINALES: Record<'ALTA' | 'BAJA', ParametrosEscenarioPeriodo[]> = {
  ALTA: [
    { modif_ord_pct: 55, mult_mas: 80, mult_menos: 60, nro_inv_des: 0 },
    { modif_ord_pct: 60, mult_mas: 80, mult_menos: 65, nro_inv_des: 0 },
    { modif_ord_pct: 62, mult_mas: 70, mult_menos: 60, nro_inv_des: 1000 },
    { modif_ord_pct: 65, mult_mas: 70, mult_menos: 50, nro_inv_des: 1500 },
    { modif_ord_pct: 65, mult_mas: 70, mult_menos: 50, nro_inv_des: 2000 },
    { modif_ord_pct: 67, mult_mas: 80, mult_menos: 50, nro_inv_des: 2500 },
    { modif_ord_pct: 70, mult_mas: 80, mult_menos: 60, nro_inv_des: 3000 }
  ],
  BAJA: [
    { modif_ord_pct: 40, mult_mas: 80, mult_menos: 60, nro_inv_des: 0 },
    { modif_ord_pct: 40, mult_mas: 80, mult_menos: 60, nro_inv_des: 0 },
    { modif_ord_pct: 42, mult_mas: 60, mult_menos: 50, nro_inv_des: 2500 },
    { modif_ord_pct: 45, mult_mas: 40, mult_menos: 30, nro_inv_des: 4000 },
    { modif_ord_pct: 47, mult_mas: 30, mult_menos: 20, nro_inv_des: 5000 },
    { modif_ord_pct: 50, mult_mas: 20, mult_menos: 10, nro_inv_des: 6000 },
    { modif_ord_pct: 50, mult_mas: 10, mult_menos: 5,  nro_inv_des: 7000 }
  ]
};

export const CONFIG_BANCOS_DEFAULT: ConfiguracionBancoYEntorno = {
  tasa_bco_a: 27.0,
  tasa_bco_b: 21.0,
  max_cred_a: 70000.0,
  max_cred_b: 80000.0,
  tasa_mantenimiento: 8.0,
  tasa_impuestos: 30.0,
  penalidad_stock: 7.0,
  tasa_giro_desc: 50.0,
  limite_giro_desc: 10000.0,
  indem_x_emp: 300.0,
  subsidio_x_emp: 100.0,
  penalidad_financiera: 500.0
};

export class SimuladorEmpresarial {
  /**
   * Emula Round() de Delphi: redondeo bancario (los empates .5 van al par más cercano).
   */
  public static delphiRound(val: number): number {
    const piso = Math.floor(val);
    const diferencia = val - piso;
    if (diferencia < 0.5) return piso;
    if (diferencia > 0.5) return piso + 1;
    return piso % 2 === 0 ? piso : piso + 1;
  }

  /**
   * Emula el truncamiento hacia cero de Delphi (0x402AD4 _TRUNC)
   */
  public static delphiTrunc(val: number): number {
    return Math.trunc(val);
  }

  /**
   * Búsqueda e interpolación lineal de costo unitario en la matriz 3D
   */
  public static lookupCostoUnitario(planta: number, nivelProd: NivelProduccion, capacitacionAcumulada: number): number {
    if (nivelProd === 0) {
      return 0.0;
    }
    const prodCosts = matrizCostos[nivelProd];
    if (!prodCosts) {
      throw new Error(`Nivel de producción inválido: ${nivelProd}%`);
    }

    // Capacitación se discretiza a pasos de $2000 entre 0 y 20000
    const capStep = Math.floor(capacitacionAcumulada / 2000) * 2000;
    const capKey = Math.max(0, Math.min(20000, capStep));

    // Planta se busca en pasos de 5000 entre 25000 y 300000
    const pLow = Math.max(25000, Math.min(300000, Math.floor(planta / 5000.0) * 5000));
    const pHigh = Math.max(25000, Math.min(300000, pLow + 5000));

    const cLow = prodCosts[pLow]?.[capKey] ?? 0;
    if (pLow === pHigh || planta === pLow) {
      return cLow;
    }

    const cHigh = prodCosts[pHigh]?.[capKey] ?? cLow;
    // Interpolación lineal exacta de 0x49E83C
    const slope = (cHigh - cLow) / 5000.0;
    return cLow + slope * (planta - pLow);
  }

  /**
   * Calcula las órdenes de mercado recibidas por cada equipo (TOrdenes 0x48EC20, 0x48EBA0, 0x48EB60)
   */
  public static calcularOrdenesMercado(
    decisiones: Array<{ precio: number; marketing: number; id_acumulado?: number; inv_des?: number }>,
    periodo: number = 0,
    scenarioParams?: ParametrosEscenarioPeriodo
  ): number[] {
    const nEquipos = decisiones.length;
    if (nEquipos === 0) return [];

    const pIdx = Math.min(6, Math.max(0, periodo));
    const params = scenarioParams ?? ESCENARIOS_ORIGINALES.ALTA[pIdx];

    const promedioPrecio = decisiones.reduce((acc, d) => acc + d.precio, 0) / nEquipos;
    const totalID = decisiones.reduce((acc, d) => acc + (d.id_acumulado ?? d.inv_des ?? 0), 0);

    return decisiones.map(d => {
      const precio = Math.max(50, Math.min(100, Math.round(d.precio)));
      const mktClamped = Math.max(0, Math.min(10000, d.marketing));
      const teamID = d.id_acumulado ?? d.inv_des ?? 0;

      // 1. Demanda Base e interpolación lineal de Marketing (0x48EC20)
      const row = matrizDemanda[precio] ?? matrizDemanda[89];
      const mktDiv = mktClamped / 1000.0;
      const lowIdx = Math.floor(mktDiv);

      let baseTable: number;
      if (lowIdx >= 10 || mktDiv === lowIdx) {
        baseTable = row[Math.min(10, lowIdx)];
      } else {
        const highIdx = lowIdx + 1;
        const diff = row[highIdx] - row[lowIdx];
        const stepSlope = diff / 1000.0;
        const dist = (highIdx * 1000.0) - mktClamped;
        baseTable = row[highIdx] - (stepSlope * dist);
      }

      // Escalado por factor de escenario
      const factor = params.modif_ord_pct / 100.0;
      const baseEscalada = this.delphiRound(baseTable * factor);

      // 2. Modificador por Precio Relativo (0x48EBA0)
      let modPrecio = 0;
      if (d.precio < promedioPrecio) {
        modPrecio = this.delphiRound((promedioPrecio - d.precio) * params.mult_mas);
      } else if (d.precio > promedioPrecio) {
        modPrecio = this.delphiRound((promedioPrecio - d.precio) * params.mult_menos); // Valor negativo
      }

      // 3. Modificador por I+D Relativo (0x48EB60)
      let modID = 0;
      if (totalID > 0 && params.nro_inv_des > 0) {
        modID = this.delphiRound((params.nro_inv_des * teamID) / totalID);
      }

      return Math.max(0, baseEscalada + modPrecio + modID);
    });
  }

  /**
   * Simula la operación completa de un equipo en un período (TCalculos)
   */
  public static simularPeriodoEquipo(
    estadoAnt: EstadoAnteriorEquipo,
    decisiones: DecisionesEquipo,
    ordenesRecibidas: number,
    configBancos: ConfiguracionBancoYEntorno = CONFIG_BANCOS_DEFAULT
  ): ResultadoSimulacionEquipo {
    const planta = estadoAnt.planta ?? 50000.0;
    const capital = estadoAnt.capital ?? 70000.0;
    const efectivoAnt = estadoAnt.efectivo ?? 0.0;
    const stockUnidAnt = estadoAnt.stock_unidades ?? 0;
    const stockValAnt = estadoAnt.stock_valorizado ?? 0.0;
    const utAcumAnt = estadoAnt.utilidad_acumulada ?? 0.0;
    const empleadosAnt = estadoAnt.empleados ?? 0;
    const prestAAnt = estadoAnt.prestamos_bco_a ?? 0.0;
    const prestBAnt = estadoAnt.prestamos_bco_b ?? 0.0;
    const capAcumAnt = estadoAnt.capacitacion_acumulada ?? 0.0;
    const idAcumAnt = estadoAnt.id_acumulado ?? 0.0;
    const periodo = estadoAnt.periodo ?? 0;

    const {
      precio,
      marketing,
      inv_des,
      capacitacion,
      nivel_prod,
      ampl_planta,
      ped_prest_a,
      ped_prest_b,
      dev_prest_a,
      dev_prest_b
    } = decisiones;

    // 1. Producción y Empleados (0x48E670)
    const capacidadPlanta = this.delphiRound(planta * 0.02);
    const produccionUnid = this.delphiRound(capacidadPlanta * (nivel_prod / 100.0));
    const plantaProxima = planta + ampl_planta;

    // Empleados: truncamiento hacia cero estricto
    const empleadosActuales = this.delphiTrunc((planta / 1000.0) * (nivel_prod / 100.0));

    let empleadosNuevos = 0;
    let empleadosDespedidos = 0;
    let indemnizaciones = 0.0;
    let subsidios = 0.0;

    if (empleadosActuales >= empleadosAnt) {
      empleadosNuevos = empleadosActuales - empleadosAnt;
      subsidios = empleadosNuevos * (configBancos.subsidio_x_emp ?? 100.0);
    } else {
      empleadosDespedidos = empleadosAnt - empleadosActuales;
      indemnizaciones = empleadosDespedidos * configBancos.indem_x_emp;
    }

    // Costo unitario depende de la capacitación ACUMULADA de períodos previos
    const costoUnitario = this.lookupCostoUnitario(planta, nivel_prod, capAcumAnt);
    const costoProdBruto = produccionUnid * costoUnitario;

    // 2. Ventas y CMV (0x48E5A4)
    const dispVenta = produccionUnid + stockUnidAnt;
    const ventasRealizadas = Math.min(ordenesRecibidas, dispVenta);
    const ordenesNoRealizadas = Math.max(0, ordenesRecibidas - ventasRealizadas);
    const ventasPesos = ventasRealizadas * precio;
    const stockUnidadesNuevo = dispVenta - ventasRealizadas;

    let cmv: number;
    let stockValNuevo: number;

    if (periodo === 0 && stockUnidAnt === 0) {
      cmv = this.delphiRound(ventasRealizadas * costoUnitario);
      stockValNuevo = this.delphiRound(stockUnidadesNuevo * costoUnitario);
    } else {
      // Precio Promedio Ponderado (PPP)
      const ppp = dispVenta > 0 ? (costoProdBruto + stockValAnt) / dispVenta : costoUnitario;
      cmv = this.delphiRound(ventasRealizadas * ppp);
      stockValNuevo = this.delphiRound(stockUnidadesNuevo * ppp);
    }

    const penalidadStock = stockUnidadesNuevo * configBancos.penalidad_stock;

    // 3. Gastos de Mantenimiento de Planta
    const mantenimiento = this.delphiRound(planta * (configBancos.tasa_mantenimiento / 100.0));

    // 4. Préstamos e Intereses (0x48E774, 0x48E860)
    const tasaPerA = configBancos.tasa_bco_a / 300.0;
    const tasaPerB = configBancos.tasa_bco_b / 300.0;

    const prestATotal = prestAAnt + ped_prest_a - dev_prest_a;
    const prestBTotal = prestBAnt + ped_prest_b - dev_prest_b;

    const interesesRegA = prestATotal * tasaPerA;
    const interesesRegB = prestBTotal * tasaPerB;
    const interesesRegulares = this.delphiRound(interesesRegA + interesesRegB);

    // Cascada de sobregiro y faltante de fondos
    const egresosCaja = costoProdBruto + mantenimiento + capacitacion + inv_des +
                        ampl_planta + dev_prest_a + dev_prest_b + indemnizaciones;
    const fondosDisp = efectivoAnt + ped_prest_a + ped_prest_b;

    let prestAdicA = 0.0;
    let prestAdicB = 0.0;
    let giroDescubierto = 0.0;
    let penalidadFinanciera = 0.0;
    let interesGiro = 0.0;

    if (egresosCaja > fondosDisp) {
      let faltante = egresosCaja - fondosDisp;

      // 1. Banco A adicional
      const cupoA = Math.max(0.0, configBancos.max_cred_a - prestATotal);
      prestAdicA = Math.min(faltante, cupoA);
      faltante -= prestAdicA;

      // 2. Banco B adicional
      if (faltante > 0) {
        const cupoB = Math.max(0.0, configBancos.max_cred_b - prestBTotal);
        prestAdicB = Math.min(faltante, cupoB);
        faltante -= prestAdicB;
      }

      // 3. Giro en descubierto
      if (faltante > 0) {
        giroDescubierto = Math.min(faltante, configBancos.limite_giro_desc);
        faltante -= giroDescubierto;
        interesGiro = giroDescubierto * (configBancos.tasa_giro_desc / 100.0);
      }

      // 4. Penalidad legal/judicial
      if (faltante > 0) {
        penalidadFinanciera = configBancos.penalidad_financiera;
      }
    }

    const interesesTotales = this.delphiRound(
      interesesRegulares + (prestAdicA * tasaPerA) + (prestAdicB * tasaPerB) + interesGiro
    );

    const prestAFinal = prestATotal + prestAdicA;
    const prestBFinal = prestBTotal + prestAdicB;
    const prestamosTomadosTotal = prestAFinal + prestBFinal + giroDescubierto;

    // 5. Estado de Resultados (0x48E948)
    const margenBruto = ventasPesos - cmv;
    const gastosOperativos = marketing + mantenimiento + capacitacion + inv_des +
                             indemnizaciones + penalidadStock + interesesTotales + penalidadFinanciera;
    const utilAntesImp = margenBruto + subsidios - gastosOperativos;

    let impuestos = 0.0;
    if (utilAntesImp > 0) {
      impuestos = this.delphiRound(utilAntesImp * (configBancos.tasa_impuestos / 100.0));
    }

    const utilPeriodo = utilAntesImp - impuestos;
    const utilAcumulada = utAcumAnt + utilPeriodo;

    // 6. Balance General (0x48EA1C)
    const pasivoPatrimonio = prestamosTomadosTotal + capital + utilAcumulada;
    const efectivoFinal = pasivoPatrimonio - plantaProxima - stockValNuevo;
    const totalActivo = efectivoFinal + stockValNuevo + plantaProxima;

    return {
      decisiones,
      reporte_produccion: {
        capacidad_planta: capacidadPlanta,
        produccion_unid: produccionUnid,
        nivel_utilizado: nivel_prod,
        costo_unitario: costoUnitario,
        empleados: empleadosActuales,
        empleados_despedidos: empleadosDespedidos,
        empleados_nuevos: empleadosNuevos
      },
      reporte_comercial: {
        ordenes_recibidas: ordenesRecibidas,
        ventas_realizadas: ventasRealizadas,
        ordenes_no_realizadas: ordenesNoRealizadas,
        stock_unidades: stockUnidadesNuevo,
        precio
      },
      estado_resultados: {
        ventas: ventasPesos,
        costo_merc_vend: cmv,
        margen_bruto: margenBruto,
        subsidios,
        marketing,
        mantenimiento,
        capacitacion,
        inv_des,
        indemnizaciones,
        mantenimiento_stock: penalidadStock,
        intereses: interesesTotales,
        penalidad: penalidadFinanciera,
        util_antes_imp: utilAntesImp,
        impuestos,
        util_periodo: utilPeriodo
      },
      balance: {
        efectivo: efectivoFinal,
        stock_valorizado: stockValNuevo,
        planta: plantaProxima,
        total_activo: totalActivo,
        prestamos_tomados: prestamosTomadosTotal,
        util_acumulada: utilAcumulada,
        capital,
        pasivo_patrimonio: pasivoPatrimonio
      },
      reporte_creditos: {
        prestamos_a: prestAFinal,
        prestamos_b: prestBFinal,
        prest_adic_a: prestAdicA,
        prest_adic_b: prestAdicB,
        giro_descubierto: giroDescubierto
      },
      proximo_periodo: {
        capacitacion_acumulada: capAcumAnt + capacitacion,
        id_acumulado: idAcumAnt + inv_des,
        planta: plantaProxima,
        capacidad: this.delphiRound(plantaProxima * 0.02)
      }
    };
  }

  /**
   * Ejecuta una ronda completa con múltiples equipos compitiendo simultáneamente en el mercado.
   */
  public static simularRondaMercado(
    equipos: Array<{
      id: string;
      nombre: string;
      estado: EstadoAnteriorEquipo;
      decisiones: DecisionesEquipo;
      configBancos?: ConfiguracionBancoYEntorno;
    }>,
    periodo: number = 0,
    scenarioParams?: ParametrosEscenarioPeriodo
  ): ResultadoRondaMercado {
    const decisionesMercado = equipos.map(e => ({
      precio: e.decisiones.precio,
      marketing: e.decisiones.marketing,
      id_acumulado: e.estado.id_acumulado ?? 0,
      inv_des: e.decisiones.inv_des
    }));

    const ordenesRecibidas = this.calcularOrdenesMercado(decisionesMercado, periodo, scenarioParams);

    const resultadosEquipos: Record<string, ResultadoSimulacionEquipo> = {};
    const itemsRanking: ItemRankingMercado[] = [];

    let totalMercadoUnidades = 0;
    let sumaPrecios = 0;

    equipos.forEach((equipo, idx) => {
      const cfg = equipo.configBancos ?? CONFIG_BANCOS_DEFAULT;
      const res = this.simularPeriodoEquipo(equipo.estado, equipo.decisiones, ordenesRecibidas[idx], cfg);
      res.equipo_id = equipo.id;
      res.nombre_equipo = equipo.nombre;

      resultadosEquipos[equipo.id] = res;
      totalMercadoUnidades += res.reporte_comercial.ventas_realizadas;
      sumaPrecios += equipo.decisiones.precio;
    });

    const precioPromedio = equipos.length > 0 ? sumaPrecios / equipos.length : 0;

    equipos.forEach(equipo => {
      const res = resultadosEquipos[equipo.id];
      const cuotaPct = totalMercadoUnidades > 0
        ? (res.reporte_comercial.ventas_realizadas / totalMercadoUnidades) * 100
        : 0;

      itemsRanking.push({
        posicion: 0,
        equipo_id: equipo.id,
        nombre: equipo.nombre,
        precio: equipo.decisiones.precio,
        marketing: equipo.decisiones.marketing,
        ordenes_recibidas: res.reporte_comercial.ordenes_recibidas,
        ventas_unidades: res.reporte_comercial.ventas_realizadas,
        ventas_pesos: res.estado_resultados.ventas,
        utilidad_periodo: res.estado_resultados.util_periodo,
        utilidad_acumulada: res.balance.util_acumulada,
        efectivo: res.balance.efectivo,
        cuota_mercado_pct: Math.round(cuotaPct * 100) / 100
      });
    });

    // Ordenar ranking por Utilidad Acumulada descendente (regla oficial del certamen)
    itemsRanking.sort((a, b) => b.utilidad_acumulada - a.utilidad_acumulada);
    itemsRanking.forEach((item, index) => {
      item.posicion = index + 1;
    });

    return {
      periodo,
      resultados_equipos: resultadosEquipos,
      ranking: itemsRanking,
      total_mercado_unidades: totalMercadoUnidades,
      precio_promedio: Math.round(precioPromedio * 100) / 100
    };
  }
}
