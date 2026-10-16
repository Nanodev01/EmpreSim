/**
 * cases.ts
 * Catálogo y motor de escenarios macroeconómicos ("Casos") dinámicos.
 */

import { ConfiguracionBancoYEntorno } from './types';
import { ParametrosEscenarioPeriodo, CONFIG_BANCOS_DEFAULT, ESCENARIOS_ORIGINALES } from './simulator';

export interface CasoPeriodoConfig {
  periodo: number;
  nombre_fase: string;
  noticia_economica: string;
  parametros_demanda: ParametrosEscenarioPeriodo;
  config_bancos: ConfiguracionBancoYEntorno;
}

export interface CasoSimulacion {
  id: string;
  nombre: string;
  categoria: 'clasico' | 'crisis' | 'expansion' | 'especial';
  descripcion: string;
  dificultad: 'Facil' | 'Media' | 'Dificil' | 'Extrema';
  periodos: CasoPeriodoConfig[];
}

export const CASOS_PREDEFINIDOS: CasoSimulacion[] = [
  {
    id: 'clasico-alta',
    nombre: 'Clásico: Demanda Alta (Certamen Oficial)',
    categoria: 'clasico',
    descripcion: 'Escenario oficial del certamen estudiantil con demanda expansiva (55% a 70%), tasas crediticias estándar y penalidades moderadas.',
    dificultad: 'Media',
    periodos: Array.from({ length: 7 }, (_, i) => ({
      periodo: i,
      nombre_fase: i === 0 ? 'Período 0 (Prueba)' : `Ronda ${i}`,
      noticia_economica: i === 0
        ? 'Inicio del certamen. Las empresas ajustan sus líneas de producción y capacitan a sus primeros colaboradores.'
        : `Ronda ${i}: Crecimiento sostenido del mercado de consumo masivo con demanda al alza.`,
      parametros_demanda: ESCENARIOS_ORIGINALES.ALTA[i],
      config_bancos: { ...CONFIG_BANCOS_DEFAULT }
    }))
  },
  {
    id: 'clasico-baja',
    nombre: 'Clásico: Demanda Baja (Mercado Competitivo)',
    categoria: 'clasico',
    descripcion: 'Escenario clásico con menor absorción de órdenes base (40% a 50%) que exige alta precisión en precios y optimización de costos.',
    dificultad: 'Media',
    periodos: Array.from({ length: 7 }, (_, i) => ({
      periodo: i,
      nombre_fase: i === 0 ? 'Período 0 (Prueba)' : `Ronda ${i}`,
      noticia_economica: `Ronda ${i}: Mercado restrictivo con clientes sensibles a precios competitivos y eficiencia fabril.`,
      parametros_demanda: ESCENARIOS_ORIGINALES.BAJA[i],
      config_bancos: { ...CONFIG_BANCOS_DEFAULT }
    }))
  },
  {
    id: 'crisis-inflacionaria',
    nombre: 'Crisis Inflacionaria y Suba de Tasas',
    categoria: 'crisis',
    descripcion: 'Fuerte shock macroeconómico. Los bancos suben fuertemente las tasas (Banco A al 45%, Banco B al 38%), encareciendo la deuda y contrayendo la demanda.',
    dificultad: 'Dificil',
    periodos: Array.from({ length: 7 }, (_, i) => ({
      periodo: i,
      nombre_fase: i === 0 ? 'Período 0 (Prueba)' : `Ronda ${i}`,
      noticia_economica: i >= 2 
        ? '¡ALERTA MACRO! El Banco Central sube drásticamente las tasas de interés para contener la inflación. El endeudamiento se vuelve altamente riesgoso.'
        : 'Estabilidad transitoria previa a la contracción del crédito.',
      parametros_demanda: {
        modif_ord_pct: Math.max(30, 48 - i * 2),
        mult_mas: 90,
        mult_menos: 75,
        nro_inv_des: i >= 2 ? 800 : 0
      },
      config_bancos: {
        ...CONFIG_BANCOS_DEFAULT,
        tasa_bco_a: 45.0,
        tasa_bco_b: 38.0,
        max_cred_a: 50000.0,
        max_cred_b: 50000.0,
        tasa_mantenimiento: 10.0,
        tasa_giro_desc: 65.0,
        penalidad_financiera: 800.0
      }
    }))
  },
  {
    id: 'boom-consumo',
    nombre: 'Boom de Consumo y Crédito Blando',
    categoria: 'expansion',
    descripcion: 'Mercado de gran liquidez, tasas bancarias bajas (15% y 12%), demanda en máximos históricos y alto retorno para quienes inviertan agresivamente en Marketing e I+D.',
    dificultad: 'Facil',
    periodos: Array.from({ length: 7 }, (_, i) => ({
      periodo: i,
      nombre_fase: i === 0 ? 'Período 0 (Prueba)' : `Ronda ${i}`,
      noticia_economica: 'Plan de estímulo económico y acceso fluido al financiamiento. Fuerte predisposición de los consumidores a productos de alta calidad.',
      parametros_demanda: {
        modif_ord_pct: Math.min(85, 65 + i * 3),
        mult_mas: 70,
        mult_menos: 45,
        nro_inv_des: i >= 2 ? 3500 : 0
      },
      config_bancos: {
        ...CONFIG_BANCOS_DEFAULT,
        tasa_bco_a: 15.0,
        tasa_bco_b: 12.0,
        max_cred_a: 120000.0,
        max_cred_b: 130000.0,
        subsidio_x_emp: 150.0
      }
    }))
  },
  {
    id: 'crisis-sobrestock',
    nombre: 'Crisis de Sobrestock y Penalidades Logísticas',
    categoria: 'especial',
    descripcion: 'Colapso logístico en almacenes. La penalidad de mantenimiento de stock sube de $7 a $15 por unidad remanente y el giro en descubierto se restringe severamente.',
    dificultad: 'Extrema',
    periodos: Array.from({ length: 7 }, (_, i) => ({
      periodo: i,
      nombre_fase: i === 0 ? 'Período 0 (Prueba)' : `Ronda ${i}`,
      noticia_economica: 'Colapso en almacenes y depósitos industriales: Producir de más sin vender genera costos de tenencia asfixiantes.',
      parametros_demanda: {
        ...ESCENARIOS_ORIGINALES.ALTA[i],
        modif_ord_pct: 52
      },
      config_bancos: {
        ...CONFIG_BANCOS_DEFAULT,
        penalidad_stock: 15.0, // Más del doble
        limite_giro_desc: 5000.0,
        tasa_giro_desc: 75.0,
        penalidad_financiera: 1000.0
      }
    }))
  }
];

export function getCasoPorId(id: string): CasoSimulacion {
  const caso = CASOS_PREDEFINIDOS.find(c => c.id === id);
  return caso ?? CASOS_PREDEFINIDOS[0];
}

export function getConfiguracionPeriodo(casoId: string, periodo: number): CasoPeriodoConfig {
  const caso = getCasoPorId(casoId);
  const pIdx = Math.min(6, Math.max(0, periodo));
  return caso.periodos[pIdx] ?? caso.periodos[0];
}
