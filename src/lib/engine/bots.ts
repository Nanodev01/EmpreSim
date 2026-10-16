/**
 * bots.ts
 * Oponentes de Inteligencia Artificial (Heurísticos y conector opcional a LLM).
 */

import { DecisionesEquipo, EstadoAnteriorEquipo, NivelProduccion } from './types';
import { CasoPeriodoConfig } from './cases';

export type PersonalidadBot = 'agresivo' | 'premium' | 'conservador' | 'equilibrado';

export interface BotDecisionOutput {
  decisiones: DecisionesEquipo;
  razonamiento_estrategico: string;
}

export interface BotContexto {
  equipo_id: string;
  nombre: string;
  personalidad: PersonalidadBot;
  estado: EstadoAnteriorEquipo;
  caso_config: CasoPeriodoConfig;
  historial_mercado?: {
    precio_promedio_anterior?: number;
    posicion_anterior?: number;
    stock_anterior?: number;
  };
}

export class BotHeuristico {
  /**
   * Genera las decisiones del bot según su personalidad y estado financiero
   */
  public static generarDecisiones(ctx: BotContexto): BotDecisionOutput {
    const { personalidad, estado, caso_config, historial_mercado } = ctx;
    const pAvg = historial_mercado?.precio_promedio_anterior ?? 89;
    const periodo = estado.periodo ?? 0;

    let precio = 89;
    let marketing = 7000;
    let inv_des = 1000;
    let capacitacion = 2000;
    let nivel_prod: NivelProduccion = 75;
    let ampl_planta = 0;
    let ped_prest_a = 0;
    let ped_prest_b = 0;
    let dev_prest_a = 0;
    let dev_prest_b = 0;
    let razonamiento = '';

    switch (personalidad) {
      case 'agresivo': {
        // Estrategia: Ganar cuota masiva con precios bajos y producción máxima
        precio = Math.max(78, Math.min(84, Math.round(pAvg - 6)));
        marketing = 9000;
        inv_des = periodo >= 2 ? 1500 : 500;
        capacitacion = 2000;
        nivel_prod = 100;
        ampl_planta = periodo <= 2 ? 10000 : 5000;
        
        // Requiere liquidez para financiar alta producción y expansión
        if (periodo === 0) {
          ped_prest_a = Math.min(50000, caso_config.config_bancos.max_cred_a);
          ped_prest_b = Math.min(40000, caso_config.config_bancos.max_cred_b);
        } else if (estado.efectivo < 20000) {
          ped_prest_a = Math.min(30000, Math.max(0, caso_config.config_bancos.max_cred_a - (estado.prestamos_bco_a ?? 0)));
        }

        razonamiento = `Estrategia de penetración agresiva: Fijo un precio de penetración de $${precio} (-$6 vs media) operando al 100% de capacidad con fuerte inversión en marketing ($${marketing}) para absorber la demanda del mercado y desplazar a los competidores.`;
        break;
      }

      case 'premium': {
        // Estrategia: Alto margen unitario, liderazgo en I+D y calidad con costos reducidos por capacitación
        precio = Math.max(93, Math.min(97, Math.round(pAvg + 4)));
        marketing = 7500;
        inv_des = periodo >= 2 ? 3000 : 1500;
        capacitacion = 4000; // Múltiplo de 2000
        nivel_prod = 75;
        ampl_planta = periodo === 1 ? 5000 : 0;

        if (periodo === 0) {
          ped_prest_a = 40000;
          ped_prest_b = 40000;
        }

        razonamiento = `Estrategia Premium de Diferenciación: Priorizo altos márgenes con precio de $${precio} respaldado por fuerte inversión en I+D ($${inv_des}) para capturar el pool de calidad y $${capacitacion} en capacitación para optimizar el costo unitario de producción.`;
        break;
      }

      case 'conservador': {
        // Estrategia: Cero riesgo de sobregiro, endeudamiento mínimo, preservación de caja
        precio = Math.max(88, Math.min(91, Math.round(pAvg)));
        marketing = 6000;
        inv_des = periodo >= 2 ? 800 : 400;
        capacitacion = 2000;
        nivel_prod = (estado.stock_unidades > 200) ? 50 : 75;
        ampl_planta = 0;

        if (periodo === 0) {
          ped_prest_a = 30000;
          ped_prest_b = 30000;
        } else if (estado.prestamos_bco_a && estado.prestamos_bco_a > 10000 && estado.efectivo > 35000) {
          dev_prest_a = 10000;
        }

        razonamiento = `Estrategia Conservadora de Liquidez: Precio alineado al mercado ($${precio}) con producción moderada al ${nivel_prod}% para blindar el balance contra costos de stock y evitar sobregiros bancarios punitorios.`;
        break;
      }

      case 'equilibrado':
      default: {
        // Estrategia: Adaptación dinámica a la ronda previa
        if (historial_mercado?.stock_anterior && historial_mercado.stock_anterior > 150) {
          // Si le sobró stock, baja precio y producción
          precio = Math.max(86, Math.round(pAvg - 2));
          nivel_prod = 50;
        } else {
          precio = Math.round(pAvg);
          nivel_prod = 75;
        }

        marketing = 7000;
        inv_des = 1000;
        capacitacion = 2000;
        ampl_planta = (estado.efectivo > 40000 && periodo <= 3) ? 5000 : 0;

        if (periodo === 0) {
          ped_prest_a = 50000;
          ped_prest_b = 45000;
        }

        razonamiento = `Estrategia Equilibrada y Adaptativa: Precio competitivo de $${precio} equilibrando un nivel de producción del ${nivel_prod}% con inversiones balanceadas en marketing ($${marketing}) y capacitación ($${capacitacion}).`;
        break;
      }
    }

    // Asegurar validaciones estrictas
    precio = Math.max(50, Math.min(100, Math.round(precio)));
    marketing = Math.max(0, Math.min(10000, Math.round(marketing)));
    capacitacion = Math.max(0, Math.min(20000, Math.floor(capacitacion / 2000) * 2000));
    ampl_planta = Math.max(0, Math.floor(ampl_planta / 5000) * 5000);

    return {
      decisiones: {
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
      },
      razonamiento_estrategico: razonamiento
    };
  }
}

export class LLMBotAgent {
  /**
   * Conector opcional a LLM (OpenAI / OpenRouter). Si no hay clave configurada o falla,
   * utiliza automáticamente el BotHeuristico como fallback robusto.
   */
  public static async tomarDecision(ctx: BotContexto): Promise<BotDecisionOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL || 'openai/gpt-4o-mini';

    if (!apiKey) {
      // Fallback transparente a heurístico
      return BotHeuristico.generarDecisiones(ctx);
    }

    try {
      const prompt = `Actúa como el Gerente General y Director Financiero del equipo "${ctx.nombre}", con perfil estratégico "${ctx.personalidad}".
Estás compitiendo en el simulador de negocios "Simulando Emprendedores".
Datos de la empresa:
- Efectivo actual: $${ctx.estado.efectivo}
- Capacidad de Planta: ${Math.round(ctx.estado.planta * 0.02)} unidades (Valor Planta: $${ctx.estado.planta})
- Stock disponible: ${ctx.estado.stock_unidades} unidades
- Deuda Bancos: A=$${ctx.estado.prestamos_bco_a ?? 0}, B=$${ctx.estado.prestamos_bco_b ?? 0}
- Situación Macroeconómica: ${ctx.caso_config.noticia_economica}
- Tasa Banco A: ${ctx.caso_config.config_bancos.tasa_bco_a}%, Banco B: ${ctx.caso_config.config_bancos.tasa_bco_b}%
- Penalidad por Stock remanente: $${ctx.caso_config.config_bancos.penalidad_stock}/unidad

Genera las 10 decisiones estrictamente válidas:
- precio: entero entre 50 y 100
- marketing: número entre 0 y 10000
- inv_des: número >= 0
- capacitacion: múltiplo de 2000 entre 0 y 20000
- nivel_prod: 0, 25, 50, 75 o 100
- ampl_planta: múltiplo de 5000 >= 0
- ped_prest_a: >= 0
- dev_prest_a: >= 0
- ped_prest_b: >= 0
- dev_prest_b: >= 0
- razonamiento: breve explicación de 2 líneas de tu jugada.

Responde ÚNICAMENTE en JSON plano con la estructura:
{"precio": number, "marketing": number, "inv_des": number, "capacitacion": number, "nivel_prod": number, "ampl_planta": number, "ped_prest_a": number, "dev_prest_a": number, "ped_prest_b": number, "dev_prest_b": number, "razonamiento": string}`;

      const baseUrl = process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const json = await res.json();
      const rawText = json.choices?.[0]?.message?.content ?? '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        decisiones: {
          precio: Math.max(50, Math.min(100, Math.round(parsed.precio ?? 89))),
          marketing: Math.max(0, Math.min(10000, Math.round(parsed.marketing ?? 7000))),
          inv_des: Math.max(0, Math.round(parsed.inv_des ?? 1000)),
          capacitacion: Math.max(0, Math.min(20000, Math.floor((parsed.capacitacion ?? 2000) / 2000) * 2000)),
          nivel_prod: ([0, 25, 50, 75, 100].includes(parsed.nivel_prod) ? parsed.nivel_prod : 75) as NivelProduccion,
          ampl_planta: Math.max(0, Math.floor((parsed.ampl_planta ?? 0) / 5000) * 5000),
          ped_prest_a: Math.max(0, Math.round(parsed.ped_prest_a ?? 0)),
          dev_prest_a: Math.max(0, Math.round(parsed.dev_prest_a ?? 0)),
          ped_prest_b: Math.max(0, Math.round(parsed.ped_prest_b ?? 0)),
          dev_prest_b: Math.max(0, Math.round(parsed.dev_prest_b ?? 0))
        },
        razonamiento_estrategico: parsed.razonamiento ?? 'Estrategia generada por IA adaptativa.'
      };
    } catch {
      // Fallback seguro a heurístico
      return BotHeuristico.generarDecisiones(ctx);
    }
  }
}
