/**
 * types.ts
 * Definición exhaustiva de interfaces y tipos para el motor del simulador empresarial.
 */

export type NivelProduccion = 0 | 25 | 50 | 75 | 100;

export interface DecisionesEquipo {
  precio: number;            // [50, 100]
  marketing: number;         // [0, 10000]
  inv_des: number;           // >= 0
  capacitacion: number;      // Múltiplos de 2000 en [0, 20000]
  nivel_prod: NivelProduccion;
  ampl_planta: number;       // Múltiplos de 5000 >= 0
  ped_prest_a: number;
  dev_prest_a: number;
  ped_prest_b: number;
  dev_prest_b: number;
}

export interface EstadoAnteriorEquipo {
  planta: number;
  capital: number;
  efectivo: number;
  stock_unidades: number;
  stock_valorizado: number;
  utilidad_acumulada: number;
  empleados: number;
  prestamos_bco_a?: number;
  prestamos_bco_b?: number;
  capacitacion_acumulada?: number;
  id_acumulado?: number;
  periodo?: number;
}

export interface ConfiguracionBancoYEntorno {
  tasa_bco_a: number;         // Tasa anual (%)
  tasa_bco_b: number;         // Tasa anual (%)
  max_cred_a: number;         // Cupo máximo crédito Banco A ($)
  max_cred_b: number;         // Cupo máximo crédito Banco B ($)
  tasa_mantenimiento: number; // Tasa sobre planta (%)
  tasa_impuestos: number;     // Tasa impuesto a las ganancias (%)
  penalidad_stock: number;    // Costo por unidad en inventario ($/u)
  tasa_giro_desc: number;     // Tasa sobregiro (%)
  limite_giro_desc: number;   // Límite máximo en descubierto ($)
  indem_x_emp: number;        // Indemnización por empleado despedido ($)
  subsidio_x_emp?: number;    // Subsidio por nuevo empleado contratado ($100 default)
  penalidad_financiera: number; // Multa si sobrepasa límite de giro ($500)
}

export interface ReporteProduccion {
  capacidad_planta: number;
  produccion_unid: number;
  nivel_utilizado: NivelProduccion;
  costo_unitario: number;
  empleados: number;
  empleados_despedidos: number;
  empleados_nuevos: number;
}

export interface ReporteComercial {
  ordenes_recibidas: number;
  ventas_realizadas: number;
  ordenes_no_realizadas: number;
  stock_unidades: number;
  precio: number;
}

export interface EstadoResultados {
  ventas: number;
  costo_merc_vend: number;
  margen_bruto: number;
  subsidios: number;
  marketing: number;
  mantenimiento: number;
  capacitacion: number;
  inv_des: number;
  indemnizaciones: number;
  mantenimiento_stock: number;
  intereses: number;
  penalidad: number;
  util_antes_imp: number;
  impuestos: number;
  util_periodo: number;
}

export interface BalanceGeneral {
  efectivo: number;
  stock_valorizado: number;
  planta: number;
  total_activo: number;
  prestamos_tomados: number;
  util_acumulada: number;
  capital: number;
  pasivo_patrimonio: number;
}

export interface ReporteCreditos {
  prestamos_a: number;
  prestamos_b: number;
  prest_adic_a: number;
  prest_adic_b: number;
  giro_descubierto: number;
}

export interface ProximoPeriodoValores {
  capacitacion_acumulada: number;
  id_acumulado: number;
  planta: number;
  capacidad: number;
}

export interface ResultadoSimulacionEquipo {
  equipo_id?: string;
  nombre_equipo?: string;
  decisiones: DecisionesEquipo;
  reporte_produccion: ReporteProduccion;
  reporte_comercial: ReporteComercial;
  estado_resultados: EstadoResultados;
  balance: BalanceGeneral;
  reporte_creditos: ReporteCreditos;
  proximo_periodo: ProximoPeriodoValores;
}

export interface ItemRankingMercado {
  posicion: number;
  equipo_id: string;
  nombre: string;
  precio: number;
  marketing: number;
  ordenes_recibidas: number;
  ventas_unidades: number;
  ventas_pesos: number;
  utilidad_periodo: number;
  utilidad_acumulada: number;
  efectivo: number;
  cuota_mercado_pct: number;
}

export interface ResultadoRondaMercado {
  periodo: number;
  resultados_equipos: Record<string, ResultadoSimulacionEquipo>;
  ranking: ItemRankingMercado[];
  total_mercado_unidades: number;
  precio_promedio: number;
}
