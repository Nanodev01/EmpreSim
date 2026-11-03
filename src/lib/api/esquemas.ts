import { z } from 'zod';

const MAX_INVERSION = 1_000_000;
export const MAX_EQUIPOS = 30;
export const PLANTA_MAXIMA = 300_000;

const importe = (nombre: string, max = MAX_INVERSION) =>
  z.number({ error: `${nombre}: ingresá un número` })
    .min(0, `${nombre} no puede ser negativo`)
    .max(max, `${nombre} no puede superar ${max}`);

const nombreLibre = (max: number) => z.string().trim().min(1).max(max);

export const esquemaDecision = z.strictObject({
  teamId: z.string().min(1).max(64),
  periodo: z.number().int().min(0).max(6),
  precio: z.number({ error: 'Precio: ingresá un número' }).int('El precio debe ser entero').min(50, 'El precio debe estar entre 50 y 100').max(100, 'El precio debe estar entre 50 y 100'),
  marketing: importe('Marketing', 10_000),
  invDes: importe('I+D'),
  capacitacion: importe('Capacitación', 20_000).refine(v => v % 2000 === 0, 'La capacitación debe ser múltiplo de 2000'),
  nivelProd: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)], {
    error: 'Elegí un nivel de producción: 0, 25, 50, 75 o 100'
  }),
  amplPlanta: importe('Ampliación de planta', PLANTA_MAXIMA).refine(v => v % 5000 === 0, 'La ampliación de planta debe ser múltiplo de 5000'),
  pedPrestA: importe('Pedido de préstamo A'),
  devPrestA: importe('Devolución de préstamo A'),
  pedPrestB: importe('Pedido de préstamo B'),
  devPrestB: importe('Devolución de préstamo B')
});

export const PERSONALIDADES = ['agresivo', 'premium', 'conservador', 'equilibrado'] as const;

export const esquemaNuevaPartida = z.object({
  nombre: z.string().trim().max(120).optional(),
  modo: z.enum(['vs-ai', 'certamen']).default('vs-ai'),
  casoId: z.string().max(64).optional(),
  nombreEmpresa: z.string().trim().max(80).optional(),
  personalidadesBots: z.array(z.enum(PERSONALIDADES)).max(8).optional(),
  equiposAlumnos: z.array(z.string().trim().max(80)).max(MAX_EQUIPOS).optional(),
  modoCompetitivo: z.boolean().optional()
});

export const esquemaNuevoEquipo = z.object({
  nombre: nombreLibre(80)
});

const numeroAcotado = (max: number) => z.number().min(0).max(max);

const esquemaPeriodoCaso = z.looseObject({
  periodo: z.number().int().min(0).max(6),
  nombre_fase: z.string().max(200),
  noticia_economica: z.string().max(2000),
  parametros_demanda: z.strictObject({
    modif_ord_pct: numeroAcotado(300),
    mult_mas: numeroAcotado(1000),
    mult_menos: numeroAcotado(1000),
    nro_inv_des: numeroAcotado(100_000)
  }),
  config_bancos: z.strictObject({
    tasa_bco_a: numeroAcotado(300),
    tasa_bco_b: numeroAcotado(300),
    max_cred_a: numeroAcotado(10_000_000),
    max_cred_b: numeroAcotado(10_000_000),
    tasa_mantenimiento: numeroAcotado(100),
    tasa_impuestos: numeroAcotado(100),
    penalidad_stock: numeroAcotado(1000),
    tasa_giro_desc: numeroAcotado(300),
    limite_giro_desc: numeroAcotado(10_000_000),
    indem_x_emp: numeroAcotado(100_000),
    subsidio_x_emp: numeroAcotado(100_000).optional(),
    penalidad_financiera: numeroAcotado(1_000_000)
  })
});

export const esquemaCaso = z.looseObject({
  id: z.string().max(64),
  nombre: z.string().max(200),
  periodos: z.array(esquemaPeriodoCaso).length(7)
});

export const esquemaActualizarPartida = z.object({
  configCasoJson: z.string().max(200_000).optional(),
  modoCompetitivo: z.boolean().optional()
});

export const esquemaCoach = z.object({
  teamId: z.string().min(1).max(64).optional()
});
