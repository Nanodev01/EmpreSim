import { DecisionesEquipo, ResultadoRondaMercado, ResultadoSimulacionEquipo } from '@/lib/engine/types';

export interface MetricasClaveAuditoria {
  utilidad_acumulada_final: number;
  posicion_final: number;
  total_equipos: number;
  unidades_totales_vendidas: number;
  facturacion_total: number;
  precio_promedio_cobrado: number;
  total_multas_sobregiro: number;
  total_indemnizaciones_despidos: number;
  costo_total_stock_ocioso: number;
  tasa_eficiencia_operativa_pct: number;
}

export interface FeedbackEquipo {
  equipo_id: string;
  nombre_equipo: string;
  calificacion_gestion: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  titulo_diagnostico: string;
  resumen_ejecutivo: string;
  puntos_fuertes: string[];
  errores_criticos: string[];
  oportunidades_perdidas: string[];
  recomendaciones_estrategicas: string[];
  metricas_clave: MetricasClaveAuditoria;
  origen: 'gemini' | 'openai' | 'heuristico';
}

export interface CoachContextoEquipo {
  equipo: {
    id: string;
    nombre: string;
    esHumano: boolean;
    utilidadAcumulada: number;
    efectivo: number;
    planta: number;
    stockUnidades: number;
    capacitacionAcum: number;
    idAcumulado: number;
    prestamosBcoA: number;
    prestamosBcoB: number;
  };
  competidores: Array<{
    id: string;
    nombre: string;
    utilidadAcumulada: number;
    esHumano: boolean;
  }>;
  decisionesPorPeriodo: Array<{
    periodo: number;
    precio: number;
    marketing: number;
    invDes: number;
    capacitacion: number;
    nivelProd: number;
    amplPlanta: number;
    pedPrestA: number;
    devPrestA: number;
    pedPrestB: number;
    devPrestB: number;
  }>;
  resultadosPorPeriodo: Array<{
    periodo: number;
    resultadoEquipo?: ResultadoSimulacionEquipo;
    precioPromedioMercado: number;
    posicionRanking: number;
    totalEquipos: number;
  }>;
}

export class BusinessCoachAI {
  /**
   * Genera una auditoría y recomendaciones estratégicas completas para un equipo.
   * Si se provee una apiKey (de Gemini o OpenAI), consulta la IA generativa.
   * Si no, utiliza el motor experto heurístico financiero integrado.
   */
  public static async generarFeedback(
    contexto: CoachContextoEquipo,
    options?: {
      apiKey?: string;
      provider?: 'gemini' | 'openai' | 'openrouter';
      model?: string;
    }
  ): Promise<FeedbackEquipo> {
    const metricas = this.calcularMetricas(contexto);

    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    const provider = options?.provider || (options?.apiKey?.startsWith('AIza') || process.env.GEMINI_API_KEY ? 'gemini' : 'gemini');

    if (apiKey) {
      try {
        if (provider === 'gemini' || apiKey.startsWith('AIza')) {
          return await this.consultarGemini(contexto, metricas, apiKey, options?.model);
        } else {
          return await this.consultarOpenAICompatible(contexto, metricas, apiKey, options?.model);
        }
      } catch (err) {
        console.warn('Fallo llamada a LLM, usando auditor experto heurístico:', err);
      }
    }

    return this.generarFeedbackHeuristico(contexto, metricas);
  }

  /**
   * Calcula las métricas acumuladas de la historia del equipo
   */
  public static calcularMetricas(contexto: CoachContextoEquipo): MetricasClaveAuditoria {
    let unidadesVendidas = 0;
    let facturacion = 0;
    let sumaPrecios = 0;
    let multasSobregiro = 0;
    let indemnizaciones = 0;
    let costoStock = 0;

    const periodos = contexto.resultadosPorPeriodo;

    periodos.forEach(p => {
      const res = p.resultadoEquipo;
      if (res) {
        unidadesVendidas += res.reporte_comercial.ventas_realizadas;
        facturacion += res.estado_resultados.ventas;
        sumaPrecios += res.reporte_comercial.precio;
        multasSobregiro += res.estado_resultados.penalidad;
        indemnizaciones += res.estado_resultados.indemnizaciones;
        costoStock += res.estado_resultados.mantenimiento_stock;
      }
    });

    const precioPromedio = periodos.length > 0 ? sumaPrecios / periodos.length : 89;
    const ultimaRonda = periodos[periodos.length - 1];
    const posFinal = ultimaRonda ? ultimaRonda.posicionRanking : 1;
    const totalEquipos = contexto.competidores.length + 1;

    // Eficiencia: penalizar si hubo multas, sobrestock excesivo o despidos evitables
    let penalizacionesPuntos = (multasSobregiro > 0 ? 25 : 0) + (indemnizaciones > 1000 ? 15 : 0) + (costoStock > 5000 ? 10 : 0);
    const rentabilidadPositiva = contexto.equipo.utilidadAcumulada > 0;
    let tasaEficiencia = rentabilidadPositiva ? Math.max(40, 100 - penalizacionesPuntos) : Math.max(10, 50 - penalizacionesPuntos);

    return {
      utilidad_acumulada_final: Math.round(contexto.equipo.utilidadAcumulada),
      posicion_final: posFinal,
      total_equipos: totalEquipos,
      unidades_totales_vendidas: unidadesVendidas,
      facturacion_total: Math.round(facturacion),
      precio_promedio_cobrado: Math.round(precioPromedio * 100) / 100,
      total_multas_sobregiro: Math.round(multasSobregiro),
      total_indemnizaciones_despidos: Math.round(indemnizaciones),
      costo_total_stock_ocioso: Math.round(costoStock),
      tasa_eficiencia_operativa_pct: Math.round(tasaEficiencia)
    };
  }

  /**
   * Auditor Heurístico Experto: Analiza patrones concretos sin necesidad de API externa.
   */
  public static generarFeedbackHeuristico(
    contexto: CoachContextoEquipo,
    metricas: MetricasClaveAuditoria
  ): FeedbackEquipo {
    const { equipo } = contexto;
    const puntosFuertes: string[] = [];
    const erroresCriticos: string[] = [];
    const oportunidadesPerdidas: string[] = [];
    const recomendaciones: string[] = [];

    // 1. Análisis de Solvencia y Sobregiro
    if (metricas.total_multas_sobregiro > 0 || equipo.efectivo < 0) {
      erroresCriticos.push(
        `Problemas de liquidez: Incurrieron en giro en descubierto pagando intereses del 18% anual y acumularon $${metricas.total_multas_sobregiro.toLocaleString()} en multas financieras punitivas.`
      );
      recomendaciones.push(
        'Planificá un flujo de caja preventivo antes de invertir: solicitá préstamos bancarios de Banco A o B con antelación para no quedar en descubierto.'
      );
    } else {
      puntosFuertes.push('Solvencia financiera impecable: Gestionaron el efectivo sin caer en descubierto bancario ni pagar multas.');
    }

    // 2. Análisis de Precios y Comercial
    const preciosCobrados = contexto.decisionesPorPeriodo.map(d => d.precio);
    const precioMedio = metricas.precio_promedio_cobrado;
    if (precioMedio < 80) {
      if (metricas.utilidad_acumulada_final > 0) {
        puntosFuertes.push(`Estrategia de penetración masiva: Mantuvieron precios agresivos (promedio $${precioMedio}) capturando gran volumen.`);
      } else {
        erroresCriticos.push(`Estrategia de Dumping insostenible: El precio promedio de $${precioMedio} no alcanzó a cubrir los costos operativos.`);
        recomendaciones.push('Aumentá gradualmente el precio a la franja de $88–$92 para recomponer márgenes brutos.');
      }
    } else if (precioMedio > 92) {
      if (equipo.idAcumulado < 2000) {
        oportunidadesPerdidas.push('Cobraste precios premium ($93+) pero con poco I+D acumulado, perdiendo ventas frente a marcas más competitivas.');
        recomendaciones.push('Para justificar precios por encima de $92, invertí sostenidamente en I+D ($1.000–$2.000 por período).');
      } else {
        puntosFuertes.push('Diferenciación de marca exitosa: Cobraron precios elevados respaldados por investigación y desarrollo.');
      }
    } else {
      puntosFuertes.push(`Precios equilibrados: Se mantuvieron en la franja competitiva óptima de mercado ($${precioMedio}).`);
    }

    // 3. Análisis de Producción y Stock
    if (metricas.costo_total_stock_ocioso > 4000) {
      erroresCriticos.push(`Sobreproducción costosa: Pagaron $${metricas.costo_total_stock_ocioso.toLocaleString()} en almacenamiento por acumular mercadería que no lograron vender.`);
      recomendaciones.push('Ajustá el nivel de producción al 50% o 75% cuando el mercado esté recesivo o tengas stock remanente en depósito.');
    } else {
      puntosFuertes.push('Gestión Just-in-Time: Mantuvieron inventarios ajustados minimizando el costo de mantenimiento de stock.');
    }

    // 4. Recursos Humanos y Despidos
    if (metricas.total_indemnizaciones_despidos > 0) {
      erroresCriticos.push(`Inestabilidad laboral: Pagaron $${metricas.total_indemnizaciones_despidos.toLocaleString()} en indemnizaciones por despedir personal al reducir drásticamente la producción.`);
      recomendaciones.push('Evitá oscilar violentamente entre el 100% y el 25% de producción: cada operario despedido cuesta $300 de indemnización.');
    }

    // 5. Capacitación de Planta
    if (equipo.capacitacionAcum >= 6000) {
      puntosFuertes.push(`Liderazgo en costos fabriles: Invirtieron $${equipo.capacitacionAcum.toLocaleString()} en capacitación, reduciendo el costo unitario de mano de obra en fábrica.`);
    } else if (equipo.capacitacionAcum === 0) {
      oportunidadesPerdidas.push('No invirtieron en Capacitación: Dejaron pasar la oportunidad de bajar permanentemente el costo unitario de producción.');
      recomendaciones.push('Invertí al menos $2.000 o $4.000 en capacitación durante los primeros períodos para ganar eficiencia fabril.');
    }

    // Asignar Calificación (Grade)
    let calificacion: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
    let tituloDiagnostico = 'Gestión Equilibrada con Potencial';

    if (metricas.posicion_final === 1 && metricas.utilidad_acumulada_final > 20000) {
      calificacion = 'A+';
      tituloDiagnostico = '¡Liderazgo de Mercado y Excelencia Financiera!';
    } else if (metricas.posicion_final <= 2 && metricas.utilidad_acumulada_final > 5000 && metricas.total_multas_sobregiro === 0) {
      calificacion = 'A';
      tituloDiagnostico = 'Estrategia Sólida y Muy Rentable';
    } else if (metricas.utilidad_acumulada_final > 0 && metricas.total_multas_sobregiro === 0) {
      calificacion = 'B';
      tituloDiagnostico = 'Operación Rentable con Margen de Optimización';
    } else if (metricas.utilidad_acumulada_final >= -5000) {
      calificacion = 'C';
      tituloDiagnostico = 'Resultados Ajustados: Requiere Reestructuración';
    } else if (metricas.total_multas_sobregiro > 0 || metricas.utilidad_acumulada_final < -15000) {
      calificacion = 'F';
      tituloDiagnostico = 'Crisis de Liquidez y Alto Riesgo Financiero';
    } else {
      calificacion = 'D';
      tituloDiagnostico = 'Pérdidas Operativas Significativas';
    }

    const resumenEjecutivo = `El equipo "${equipo.nombre}" culminó la competencia en la posición #${metricas.posicion_final} de ${metricas.total_equipos} empresas, alcanzando una Utilidad Acumulada de $${metricas.utilidad_acumulada_final.toLocaleString()} con ${metricas.unidades_totales_vendidas.toLocaleString()} unidades vendidas por un total de $${metricas.facturacion_total.toLocaleString()}. Su desempeño demostró ${calificacion === 'A+' || calificacion === 'A' ? 'un extraordinario balance entre atracción comercial y disciplina de costos.' : calificacion === 'B' ? 'buenos fundamentos de negocio, aunque con fugas de rentabilidad que impidieron la cima del podio.' : 'severas dificultades en la planificación de caja y dimensionamiento de la demanda.'}`;

    return {
      equipo_id: equipo.id,
      nombre_equipo: equipo.nombre,
      calificacion_gestion: calificacion,
      titulo_diagnostico: tituloDiagnostico,
      resumen_ejecutivo: resumenEjecutivo,
      puntos_fuertes: puntosFuertes.length > 0 ? puntosFuertes : ['Participaron en todas las rondas comerciales del mercado.'],
      errores_criticos: erroresCriticos.length > 0 ? erroresCriticos : ['No se detectaron errores críticos graves en la operación.'],
      oportunidades_perdidas: oportunidadesPerdidas.length > 0 ? oportunidadesPerdidas : ['Pudieron haber escalado la planta fabril con mayor agresividad.'],
      recomendaciones_estrategicas: recomendaciones.length > 0 ? recomendaciones : ['Mantengan la estrategia actual ajustando precios según la inflación del caso.'],
      metricas_clave: metricas,
      origen: 'heuristico'
    };
  }

  /**
   * Consulta a la API de Google Gemini (v1beta o v1)
   */
  public static async consultarGemini(
    contexto: CoachContextoEquipo,
    metricas: MetricasClaveAuditoria,
    apiKey: string,
    modelName: string = 'gemini-2.5-flash'
  ): Promise<FeedbackEquipo> {
    // Si viene gemini-2.0-flash (descontinuado por Google), migrar a gemini-2.5-flash
    let targetModel = modelName;
    if (targetModel === 'gemini-2.0-flash') {
      targetModel = 'gemini-2.5-flash';
    }

    const candidateModels = [targetModel, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
      .filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;

    for (const modelToTry of candidateModels) {
      try {
        const prompt = this.construirPrompt(contexto, metricas);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey}`;

        const body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini API Error (${res.status}) [${modelToTry}]: ${errText}`);
        }

        const data = await res.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error(`Respuesta vacía de Gemini API con ${modelToTry}`);
        }

        const jsonParsed = JSON.parse(candidateText);

        return {
          equipo_id: contexto.equipo.id,
          nombre_equipo: contexto.equipo.nombre,
          calificacion_gestion: jsonParsed.calificacion_gestion || 'B',
          titulo_diagnostico: jsonParsed.titulo_diagnostico || 'Diagnóstico Estratégico Gemini',
          resumen_ejecutivo: jsonParsed.resumen_ejecutivo || '',
          puntos_fuertes: Array.isArray(jsonParsed.puntos_fuertes) ? jsonParsed.puntos_fuertes : [],
          errores_criticos: Array.isArray(jsonParsed.errores_criticos) ? jsonParsed.errores_criticos : [],
          oportunidades_perdidas: Array.isArray(jsonParsed.oportunidades_perdidas) ? jsonParsed.oportunidades_perdidas : [],
          recomendaciones_estrategicas: Array.isArray(jsonParsed.recomendaciones_estrategicas) ? jsonParsed.recomendaciones_estrategicas : [],
          metricas_clave: metricas,
          origen: 'gemini'
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Intento con ${modelToTry} falló:`, err.message);
      }
    }

    throw lastError || new Error('No se pudo conectar con ningún modelo de Gemini');
  }

  /**
   * Consulta a API compatible con OpenAI / OpenRouter
   */
  public static async consultarOpenAICompatible(
    contexto: CoachContextoEquipo,
    metricas: MetricasClaveAuditoria,
    apiKey: string,
    modelName: string = 'gpt-4o-mini'
  ): Promise<FeedbackEquipo> {
    const prompt = this.construirPrompt(contexto, metricas);
    const isOpenRouter = apiKey.startsWith('sk-or-');
    const endpoint = isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: 'Sos un mentor financiero de simulador empresarial. Respondé estrictamente en formato JSON válido.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonParsed = JSON.parse(content);

    return {
      equipo_id: contexto.equipo.id,
      nombre_equipo: contexto.equipo.nombre,
      calificacion_gestion: jsonParsed.calificacion_gestion || 'B',
      titulo_diagnostico: jsonParsed.titulo_diagnostico || 'Diagnóstico Estratégico IA',
      resumen_ejecutivo: jsonParsed.resumen_ejecutivo || '',
      puntos_fuertes: Array.isArray(jsonParsed.puntos_fuertes) ? jsonParsed.puntos_fuertes : [],
      errores_criticos: Array.isArray(jsonParsed.errores_criticos) ? jsonParsed.errores_criticos : [],
      oportunidades_perdidas: Array.isArray(jsonParsed.oportunidades_perdidas) ? jsonParsed.oportunidades_perdidas : [],
      recomendaciones_estrategicas: Array.isArray(jsonParsed.recomendaciones_estrategicas) ? jsonParsed.recomendaciones_estrategicas : [],
      metricas_clave: metricas,
      origen: 'openai'
    };
  }

  private static construirPrompt(contexto: CoachContextoEquipo, metricas: MetricasClaveAuditoria): string {
    return `
Sos un destacado Director Financiero (CFO) y Profesor de Negocios evaluando a un equipo de alumnos en un simulador de gestión empresarial (10 decisiones por período: Precio, Marketing, Nivel de Producción 0-100%, Capacitación, I+D, Ampliación de Planta, Créditos Banco A y B).

DATOS DEL EQUIPO EVALUADO:
- Nombre: "${contexto.equipo.nombre}"
- Posición Final en el Certamen: #${metricas.posicion_final} de ${metricas.total_equipos} equipos
- Utilidad Neta Acumulada Final: $${metricas.utilidad_acumulada_final}
- Unidades Vendidas Totales: ${metricas.unidades_totales_vendidas}
- Facturación Total: $${metricas.facturacion_total}
- Precio Promedio Cobrado: $${metricas.precio_promedio_cobrado}
- Total Multas por Giro en Descubierto: $${metricas.total_multas_sobregiro}
- Total Indemnizaciones por Despido de Personal: $${metricas.total_indemnizaciones_despidos}
- Costo Total de Almacenamiento por Sobrestock: $${metricas.costo_total_stock_ocioso}
- Efectivo Final en Caja: $${Math.round(contexto.equipo.efectivo)}
- Capacidad de Planta Final: ${Math.round(contexto.equipo.planta * 0.02)} unidades
- Capacitación Acumulada: $${contexto.equipo.capacitacionAcum}
- I+D Acumulado: $${contexto.equipo.idAcumulado}

HISTORIAL DE DECISIONES DE TODAS LAS RONDAS:
${JSON.stringify(contexto.decisionesPorPeriodo, null, 2)}

COMPETIDORES:
${JSON.stringify(contexto.competidores, null, 2)}

INSTRUCCIÓN:
Generá una devolución pedagógica, clara y motivadora para los alumnos, explicando exactamente por qué obtuvieron este resultado contable y comercial, qué errores costosos cometieron (ej. multas de descubierto, despidos, sobreproducción sin demanda, dumping) y recomendaciones prácticas para su próximo torneo.

Respondé ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "calificacion_gestion": "A+" | "A" | "B" | "C" | "D" | "F",
  "titulo_diagnostico": "Título breve y contundente",
  "resumen_ejecutivo": "Párrafo de 3 a 5 oraciones resumiendo el desempeño del equipo",
  "puntos_fuertes": ["Punto fuerte 1 con cifras", "Punto fuerte 2 con cifras", "Punto fuerte 3"],
  "errores_criticos": ["Error o fuga de dinero 1 con cifras", "Error 2"],
  "oportunidades_perdidas": ["Oportunidad desaprovechada 1", "Oportunidad 2"],
  "recomendaciones_estrategicas": ["Consejo concreto para el futuro 1", "Consejo 2", "Consejo 3"]
}
`;
  }
}
