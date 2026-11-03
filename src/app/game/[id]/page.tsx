'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  TrendingUp,
  Building2,
  DollarSign,
  Package,
  Users,
  ShieldCheck,
  AlertCircle,
  Play,
  FileText,
  Trophy,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Flame,
  Brain,
  Bot,
  CheckCircle2,
  Clock,
  RefreshCw,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Plus,
  HelpCircle,
  Sparkles,
  Award,
  BookOpen,
  X,
  Check,
  Flag,
  Settings,
  Layers,
  CheckCheck,
  Trash2,
  Swords,
  EyeOff
} from 'lucide-react';
import { SimuladorEmpresarial } from '@/lib/engine/simulator';
import { DecisionesEquipo, NivelProduccion, ResultadoSimulacionEquipo, ResultadoRondaMercado } from '@/lib/engine/types';
import { CasoSimulacion, CasoPeriodoConfig } from '@/lib/engine/cases';
import { FeedbackEquipo } from '@/lib/ai/coach';

type CampoNumerico = number | '';

const numero = (valor: CampoNumerico) => (valor === '' ? 0 : valor);
const leerCampo = (valor: string): CampoNumerico => (valor === '' ? '' : Number(valor));

export default function GameDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [guardandoDecision, setGuardandoDecision] = useState(false);
  const [creandoEquipo, setCreandoEquipo] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [activeTab, setActiveTab] = useState<'cupon' | 'reporte' | 'mercado' | 'resumen' | 'coordinador'>('cupon');

  // Control de turnos de equipos de alumnos
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedReportTeamId, setSelectedReportTeamId] = useState<string>('');
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [nuevoEquipoNombre, setNuevoEquipoNombre] = useState<string>('');
  const [showDidacticModal, setShowDidacticModal] = useState<boolean>(false);
  const [mensajeTurno, setMensajeTurno] = useState<string | null>(null);

  // Módulo de Resumen y Recomendaciones
  const [selectedFeedbackTeamId, setSelectedFeedbackTeamId] = useState<string>('');
  const [feedbackData, setFeedbackData] = useState<FeedbackEquipo | null>(null);
  const [generandoFeedback, setGenerandoFeedback] = useState(false);

  // Decisiones del equipo activo para la ronda actual
  const [precio, setPrecio] = useState<CampoNumerico>('');
  const [marketing, setMarketing] = useState<CampoNumerico>('');
  const [invDes, setInvDes] = useState<CampoNumerico>('');
  const [capacitacion, setCapacitacion] = useState<CampoNumerico>('');
  const [nivelProd, setNivelProd] = useState<NivelProduccion | ''>('');
  const [amplPlanta, setAmplPlanta] = useState<CampoNumerico>('');
  const [pedPrestA, setPedPrestA] = useState<CampoNumerico>('');
  const [devPrestA, setDevPrestA] = useState<CampoNumerico>('');
  const [pedPrestB, setPedPrestB] = useState<CampoNumerico>('');
  const [devPrestB, setDevPrestB] = useState<CampoNumerico>('');

  // Editor del Coordinador (TFMODIFICARDATOS)
  const [editorTasaA, setEditorTasaA] = useState<number>(27);
  const [editorTasaB, setEditorTasaB] = useState<number>(21);
  const [editorMaxCredA, setEditorMaxCredA] = useState<number>(70000);
  const [editorMaxCredB, setEditorMaxCredB] = useState<number>(80000);
  const [editorMantenimiento, setEditorMantenimiento] = useState<number>(8);
  const [editorImpuestos, setEditorImpuestos] = useState<number>(30);
  const [editorPenalidadStock, setEditorPenalidadStock] = useState<number>(7);
  const [editorFactorDemanda, setEditorFactorDemanda] = useState<number>(55);

  useEffect(() => {
    // Versiones anteriores guardaban la clave de IA en el navegador: se elimina.
    try {
      localStorage.removeItem('SIMULADOR_GEMINI_KEY');
      localStorage.removeItem('SIMULADOR_GEMINI_MODEL');
    } catch {}
    fetchGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const fetchGame = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) {
        setNoDisponible(true);
        return;
      }
      const data = await res.json();
      setGame(data);

      const humanos = data.teams?.filter((t: any) => t.esHumano) || [];
      const enTurno = humanos.find((t: any) => !t.yaGuardo);
      const primero = humanos[0]?.id ?? data.teams?.[0]?.id;
      setSelectedTeamId(enTurno?.id ?? '');
      if (!selectedReportTeamId) {
        setSelectedReportTeamId(primero);
      }
      if (!selectedFeedbackTeamId) {
        setSelectedFeedbackTeamId(primero);
      }

      // Si el equipo ya tiene feedback guardado en BD, cargarlo
      const fbTeam = data.teams?.find((t: any) => t.id === (selectedFeedbackTeamId || primero));
      if (fbTeam?.feedbackJson) {
        try {
          setFeedbackData(JSON.parse(fbTeam.feedbackJson));
        } catch {}
      }

      // Si la partida ya fue finalizada, sugerir la pestaña de resumen
      if (data.estado === 'finalizada' && activeTab === 'cupon') {
        setActiveTab('resumen');
      }

      // Inicializar valores del editor del caso
      try {
        const caso: CasoSimulacion = JSON.parse(data.configCasoJson);
        const pCfg: CasoPeriodoConfig = caso.periodos[data.periodoActual] || caso.periodos[0];
        setEditorTasaA(pCfg.config_bancos.tasa_bco_a);
        setEditorTasaB(pCfg.config_bancos.tasa_bco_b);
        setEditorMaxCredA(pCfg.config_bancos.max_cred_a);
        setEditorMaxCredB(pCfg.config_bancos.max_cred_b);
        setEditorMantenimiento(pCfg.config_bancos.tasa_mantenimiento);
        setEditorImpuestos(pCfg.config_bancos.tasa_impuestos);
        setEditorPenalidadStock(pCfg.config_bancos.penalidad_stock);
        setEditorFactorDemanda(pCfg.parametros_demanda.modif_ord_pct);
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const limpiarCupon = () => {
    setPrecio('');
    setMarketing('');
    setInvDes('');
    setCapacitacion('');
    setNivelProd('');
    setAmplPlanta('');
    setPedPrestA('');
    setDevPrestA('');
    setPedPrestB('');
    setDevPrestB('');
  };

  const handleGuardarDecision = async () => {
    if (!selectedTeamId || !game) return;

    const bloqueaDevolucion = game.periodoActual === 0;
    const faltantes = [
      precio === '' && 'Precio',
      marketing === '' && 'Marketing',
      nivelProd === '' && 'Nivel de producción',
      capacitacion === '' && 'Capacitación',
      invDes === '' && 'I+D',
      amplPlanta === '' && 'Ampliación de planta',
      pedPrestA === '' && 'Pedido de préstamo A',
      !bloqueaDevolucion && devPrestA === '' && 'Devolución de préstamo A',
      pedPrestB === '' && 'Pedido de préstamo B',
      !bloqueaDevolucion && devPrestB === '' && 'Devolución de préstamo B'
    ].filter(Boolean);
    if (faltantes.length > 0) {
      alert(`Completá todos los campos antes de guardar (poné 0 si no corresponde):\n\n${faltantes.join('\n')}`);
      return;
    }

    const equipoActual = game.teams?.find((t: any) => t.id === selectedTeamId);
    const siguiente = game.teams?.find((t: any) => t.esHumano && !t.yaGuardo && t.id !== selectedTeamId);

    setGuardandoDecision(true);
    try {
      const res = await fetch(`/api/games/${gameId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          periodo: game.periodoActual,
          precio,
          marketing,
          invDes,
          capacitacion,
          nivelProd,
          amplPlanta,
          pedPrestA,
          devPrestA: numero(devPrestA),
          pedPrestB,
          devPrestB: numero(devPrestB)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al guardar los resultados');
        return;
      }

      // El cupón se vacía antes de mostrar la tarjeta siguiente: nadie ve lo que cargó el equipo anterior.
      limpiarCupon();
      await fetchGame();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setMensajeTurno(
        siguiente
          ? `✅ Guardado para ${equipoActual?.nombre}. ¡Turno de ${siguiente.nombre}!`
          : '🎉 ¡Todos los equipos guardaron sus resultados!'
      );
      setTimeout(() => setMensajeTurno(null), 4000);
    } catch (err) {
      alert('Error de red al guardar los resultados');
    } finally {
      setGuardandoDecision(false);
    }
  };

  const handleCrearNuevoEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEquipoNombre.trim()) return;

    setCreandoEquipo(true);
    try {
      const res = await fetch(`/api/games/${gameId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoEquipoNombre.trim(),
          esHumano: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear equipo');
      }

      const nuevoEquipo = await res.json();
      setNuevoEquipoNombre('');
      setShowAddTeamModal(false);
      await fetchGame();
      setMensajeTurno(`🎉 ¡Equipo "${nuevoEquipo.nombre}" agregado con éxito!`);
      setTimeout(() => setMensajeTurno(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al agregar nuevo equipo');
    } finally {
      setCreandoEquipo(false);
    }
  };

  const handleFinalizarCiclo = async () => {
    if (!game) return;

    const aviso = game.modoCompetitivo
      ? `¿Finalizar el ciclo del Período ${game.periodoActual}? Se simula el mercado y se publica el ranking.`
      : `¿Finalizar el ciclo del Período ${game.periodoActual}? Se simula el mercado y se muestran los resultados.`;
    if (!confirm(aviso)) return;

    setSimulando(true);
    try {
      const res = await fetch(`/api/games/${gameId}/simulate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al finalizar el ciclo');
        return;
      }

      const { proximoPeriodo } = await res.json();
      await fetchGame();
      setActiveTab(game.modoCompetitivo && proximoPeriodo > 6 ? 'resumen' : 'mercado');
    } catch (err) {
      alert('Error de red al finalizar el ciclo');
    } finally {
      setSimulando(false);
    }
  };

  const handleFinalizarPartida = async () => {
    if (!confirm('¿Deseas finalizar oficialmente la partida? Se cerrará el certamen, se proclamará el podio final y se habilitará el informe histórico con recomendaciones de IA.')) {
      return;
    }

    setFinalizando(true);
    try {
      const res = await fetch(`/api/games/${gameId}/finish`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al finalizar partida');
      } else {
        await fetchGame();
        setActiveTab('resumen');
        setMensajeTurno('🏆 ¡Partida finalizada con éxito! Podio proclamado.');
        setTimeout(() => setMensajeTurno(null), 4000);
      }
    } catch (err) {
      alert('Error al finalizar partida');
    } finally {
      setFinalizando(false);
    }
  };

  const handleEliminarEstaPartida = async () => {
    if (!confirm(`¿Eliminar definitivamente esta partida ("${game.nombre}") y todos sus registros históricos? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      } else {
        alert('Error al eliminar partida');
      }
    } catch {
      alert('Error de red al eliminar partida');
    }
  };

  const handleGenerarFeedback = async (teamIdToUse?: string) => {
    const tid = teamIdToUse || selectedFeedbackTeamId || activeTeam.id;
    setGenerandoFeedback(true);
    try {
      const res = await fetch(`/api/games/${gameId}/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: tid })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al generar devolución');
      } else {
        const data: FeedbackEquipo = await res.json();
        setFeedbackData(data);
        await fetchGame();
        setMensajeTurno(`✨ Auditoría generada para ${data.nombre_equipo}`);
        setTimeout(() => setMensajeTurno(null), 3000);
      }
    } catch (err) {
      alert('Error al consultar el coach de IA');
    } finally {
      setGenerandoFeedback(false);
    }
  };

  const handleGuardarConfiguracionCaso = async () => {
    try {
      const caso: CasoSimulacion = JSON.parse(game.configCasoJson);
      const pIdx = game.periodoActual;
      if (caso.periodos[pIdx]) {
        caso.periodos[pIdx].config_bancos.tasa_bco_a = editorTasaA;
        caso.periodos[pIdx].config_bancos.tasa_bco_b = editorTasaB;
        caso.periodos[pIdx].config_bancos.max_cred_a = editorMaxCredA;
        caso.periodos[pIdx].config_bancos.max_cred_b = editorMaxCredB;
        caso.periodos[pIdx].config_bancos.tasa_mantenimiento = editorMantenimiento;
        caso.periodos[pIdx].config_bancos.tasa_impuestos = editorImpuestos;
        caso.periodos[pIdx].config_bancos.penalidad_stock = editorPenalidadStock;
        caso.periodos[pIdx].parametros_demanda.modif_ord_pct = editorFactorDemanda;
      }

      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configCasoJson: JSON.stringify(caso) })
      });

      if (res.ok) {
        alert('✅ Parámetros macroeconómicos actualizados con éxito.');
        fetchGame();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar caso');
      }
    } catch (err) {
      alert('Error al actualizar caso');
    }
  };

  const handleToggleModoCompetitivo = async () => {
    const nuevoModo = !game.modoCompetitivo;
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modoCompetitivo: nuevoModo })
      });
      if (res.ok) {
        await fetchGame();
        setMensajeTurno(nuevoModo ? '🔥 Modo Competitivo activado: Calculadora y pistas desactivadas.' : '🎓 Modo Práctica activado: Calculadora y ayudas habilitadas.');
        setTimeout(() => setMensajeTurno(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al cambiar modo');
      }
    } catch {
      alert('Error al cambiar modo');
    }
  };

  // Paleta de colores para los equipos
  const getTeamBadgeColor = (idx: number) => {
    const palette = [
      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', active: 'ring-emerald-500 border-emerald-500 bg-emerald-500/20' },
      { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', active: 'ring-cyan-500 border-cyan-500 bg-cyan-500/20' },
      { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', active: 'ring-violet-500 border-violet-500 bg-violet-500/20' },
      { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', active: 'ring-amber-500 border-amber-500 bg-amber-500/20' },
      { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', active: 'ring-rose-500 border-rose-500 bg-rose-500/20' },
      { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', active: 'ring-blue-500 border-blue-500 bg-blue-500/20' }
    ];
    return palette[idx % palette.length];
  };

  // Parsear la configuración del caso para el período activo
  const casoConfig = useMemo<CasoPeriodoConfig | null>(() => {
    if (!game?.configCasoJson) return null;
    try {
      const caso: CasoSimulacion = JSON.parse(game.configCasoJson);
      return caso.periodos[game.periodoActual] || caso.periodos[0];
    } catch {
      return null;
    }
  }, [game?.configCasoJson, game?.periodoActual]);

  const { humanTeams, botTeams } = useMemo(() => {
    if (!game?.teams) return { humanTeams: [], botTeams: [] };
    const human = game.teams.filter((t: any) => t.esHumano);
    const bot = game.teams.filter((t: any) => !t.esHumano);
    return { humanTeams: human, botTeams: bot };
  }, [game?.teams]);

  const activeTeam = useMemo(() => {
    if (!game?.teams || game.teams.length === 0) return null;
    return game.teams.find((t: any) => t.id === selectedTeamId) || humanTeams[0] || game.teams[0];
  }, [game?.teams, selectedTeamId, humanTeams]);

  const activeReportTeam = useMemo(() => {
    if (!game?.teams || game.teams.length === 0) return activeTeam;
    return game.teams.find((t: any) => t.id === selectedReportTeamId) || activeTeam;
  }, [game?.teams, selectedReportTeamId, activeTeam]);

  const activeFeedbackTeam = useMemo(() => {
    if (!game?.teams || game.teams.length === 0) return activeTeam;
    return game.teams.find((t: any) => t.id === selectedFeedbackTeamId) || activeTeam;
  }, [game?.teams, selectedFeedbackTeamId, activeTeam]);

  // Contador de equipos listos para la ronda
  const equiposListosCount = useMemo(() => {
    return humanTeams.filter((t: any) => t.yaGuardo).length;
  }, [humanTeams]);

  const todosListos = humanTeams.length > 0 && equiposListosCount === humanTeams.length;
  const enCurso = game?.estado !== 'finalizada';
  const cicloCompleto = todosListos && enCurso;
  const resultadosOcultos = Boolean(game?.modoCompetitivo) && enCurso;

  // Calculadora Preventiva para el equipo activo (evitar cálculo si está en modo competitivo)
  const calculoPreventivo = useMemo(() => {
    if (!casoConfig || !activeTeam || game?.modoCompetitivo || precio === '' || nivelProd === '') return null;
    try {
      const ordenesEstimadas = 1000;
      return SimuladorEmpresarial.simularPeriodoEquipo(
        {
          planta: activeTeam.planta,
          capital: activeTeam.capital,
          efectivo: activeTeam.efectivo,
          stock_unidades: activeTeam.stockUnidades,
          stock_valorizado: activeTeam.stockValorizado,
          capacitacion_acumulada: activeTeam.capacitacionAcum,
          id_acumulado: activeTeam.idAcumulado,
          empleados: activeTeam.empleados,
          prestamos_bco_a: activeTeam.prestamosBcoA,
          prestamos_bco_b: activeTeam.prestamosBcoB,
          utilidad_acumulada: activeTeam.utilidadAcumulada,
          periodo: game.periodoActual
        },
        {
          precio,
          marketing: numero(marketing),
          inv_des: numero(invDes),
          capacitacion: numero(capacitacion),
          nivel_prod: nivelProd,
          ampl_planta: numero(amplPlanta),
          ped_prest_a: numero(pedPrestA),
          dev_prest_a: numero(devPrestA),
          ped_prest_b: numero(pedPrestB),
          dev_prest_b: numero(devPrestB)
        },
        ordenesEstimadas,
        casoConfig.config_bancos
      );
    } catch (e) {
      console.error('Error calculo preventivo:', e);
      return null;
    }
  }, [
    casoConfig,
    activeTeam,
    game?.modoCompetitivo,
    game?.periodoActual,
    precio,
    marketing,
    invDes,
    capacitacion,
    nivelProd,
    amplPlanta,
    pedPrestA,
    devPrestA,
    pedPrestB,
    devPrestB
  ]);

  // Parsear el último reporte de mercado
  const ultimoReporte = useMemo<ResultadoRondaMercado | null>(() => {
    if (!game?.rounds || game.rounds.length === 0) return null;
    try {
      return JSON.parse(game.rounds[0].resultadoJson);
    } catch {
      return null;
    }
  }, [game?.rounds]);

  // Ranking ordenado de todos los equipos por utilidad acumulada final
  const rankingFinalEquipos = useMemo(() => {
    if (!game?.teams) return [];
    return [...game.teams].sort((a, b) => b.utilidadAcumulada - a.utilidadAcumulada);
  }, [game?.teams]);

  if (noDisponible) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-center px-6 gap-4">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-medium max-w-md">
          Esta partida no existe o fue creada desde otro navegador. Cada partida solo se puede abrir desde el navegador donde se creó.
        </p>
        <Link href="/" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (loading || !game || !activeTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium">Cargando datos del mercado y equipos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Toast de notificación de turnos */}
      {mensajeTurno && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-400 text-emerald-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{mensajeTurno}</span>
        </div>
      )}

      {/* Header Superior */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Volver al Lobby"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">{game.nombre}</span>
                {game.estado === 'finalizada' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                    <Flag className="w-3 h-3" /> Finalizada
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    {game.periodoActual === 0 ? 'Período 0 (Prueba)' : `Período ${game.periodoActual} de 6`}
                  </span>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {game.modo === 'certamen' ? 'Aula / Alumnos' : 'vs Bots IA'}
                </span>
                {game.modoCompetitivo ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                    <Swords className="w-3 h-3 text-amber-400" /> Modo Competitivo
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-emerald-400" /> Modo Práctica
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block font-mono">
                {humanTeams.length} Equipos de Alumnos • {game.periodoActual} Rondas Simuladas
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {!game.modoCompetitivo && (
              <button
                onClick={() => setShowDidacticModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/20 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Guía Didáctica</span>
              </button>
            )}

            {game.estado !== 'finalizada' && (
              <button
                onClick={handleFinalizarPartida}
                disabled={finalizando || game.periodoActual === 0}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 hover:border-rose-500/30 transition-all disabled:opacity-40"
                title="Cerrar el certamen y proclamar ganadores"
              >
                <Flag className="w-4 h-4" />
                <span>Finalizar</span>
              </button>
            )}

            {enCurso ? (
              cicloCompleto && (
                <button
                  onClick={handleFinalizarCiclo}
                  disabled={simulando}
                  className="px-4 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{simulando ? 'Procesando...' : 'Finalizar el ciclo'}</span>
                </button>
              )
            ) : (
              <button
                onClick={() => setActiveTab('resumen')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
              >
                <Trophy className="w-4 h-4" />
                <span>Ver Podio y Feedback</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Contexto Macroeconómico ("Caso") */}
      {casoConfig && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5 shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Situación Macroeconómica:
              </span>
              <span className="text-slate-300 line-clamp-1">{casoConfig.noticia_economica}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px] shrink-0">
              <span>Tasa A: <strong className="text-white">{casoConfig.config_bancos.tasa_bco_a}%</strong></span>
              <span>Tasa B: <strong className="text-white">{casoConfig.config_bancos.tasa_bco_b}%</strong></span>
              <span>Multa Stock: <strong className="text-amber-400">${casoConfig.config_bancos.penalidad_stock}/u</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE TURNOS DE ALUMNOS (Turn Stepper) - Visible en juego activo */}
      {game.estado !== 'finalizada' && (
        <section className="bg-slate-900/90 border-b border-slate-800 py-3 px-6 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Selector de Turno */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                Turno:
              </span>

              {humanTeams.map((team: any, idx: number) => {
                const isSelected = team.id === selectedTeamId;
                const color = getTeamBadgeColor(idx);

                return (
                  <div
                    key={team.id}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? `ring-2 ${color.active} text-white shadow-md`
                        : team.yaGuardo
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${color.bg} ${color.text}`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold">{team.nombre}</span>
                    {team.yaGuardo ? (
                      <span className="flex items-center text-[10px] text-emerald-400 font-bold gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" /> Listo
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        {isSelected ? 'Cargando...' : 'Pendiente'}
                      </span>
                    )}
                  </div>
                );
              })}

              {game.periodoActual === 0 && (
              <button
                onClick={() => setShowAddTeamModal(true)}
                className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/40 text-slate-400 hover:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                title="Sumar otro equipo de alumnos"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Sumar Equipo</span>
              </button>
              )}
            </div>

            {/* Progreso de Carga */}
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Progreso de Carga:</span>
                <span className={`font-mono font-bold ${todosListos ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {equiposListosCount} de {humanTeams.length} listos
                </span>
              </div>

              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${todosListos ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  style={{ width: `${(equiposListosCount / Math.max(1, humanTeams.length)) * 100}%` }}
                />
              </div>

              {todosListos && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ¡Mercado Listo!
                </span>
              )}
            </div>

          </div>
        </section>
      )}

      {/* KPI Cards Bar del Equipo Activo */}
      {!cicloCompleto && (
      <section className="bg-slate-900/40 border-b border-slate-800/80 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Indicadores de "{activeTeam.nombre}" al inicio de la ronda:
            </span>
            <span className="text-xs font-mono text-slate-400">
              Período Activo: <strong className="text-white">{game.periodoActual}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">Efectivo en Caja</span>
              <span className={`text-lg font-bold font-mono ${activeTeam.efectivo < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${Math.round(activeTeam.efectivo).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">Utilidad Acumulada</span>
              <span className={`text-lg font-bold font-mono ${activeTeam.utilidadAcumulada < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                ${Math.round(activeTeam.utilidadAcumulada).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">Planta / Capacidad</span>
              <span className="text-lg font-bold font-mono text-white">
                {Math.round(activeTeam.planta * 0.02)} <span className="text-xs font-normal text-slate-400">u. (${Math.round(activeTeam.planta).toLocaleString()})</span>
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">Stock en Depósito</span>
              <span className={`text-lg font-bold font-mono ${activeTeam.stockUnidades > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {activeTeam.stockUnidades} <span className="text-xs font-normal text-slate-400">unid.</span>
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">Capacitación Acum.</span>
              <span className="text-lg font-bold font-mono text-purple-400">
                ${Math.round(activeTeam.capacitacionAcum).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium block">I+D Acumulado</span>
              <span className="text-lg font-bold font-mono text-teal-400">
                ${Math.round(activeTeam.idAcumulado).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6">
        <div className="max-w-7xl mx-auto flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {enCurso && (
          <button
            onClick={() => setActiveTab('cupon')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'cupon'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Cupón de Decisiones y Calculadora
          </button>
          )}

          {!resultadosOcultos && (
          <button
            onClick={() => setActiveTab('reporte')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'reporte'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Reporte Financiero Oficial
          </button>
          )}

          <button
            onClick={() => setActiveTab('mercado')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'mercado'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Mercado y Ranking
          </button>

          {!resultadosOcultos && (
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'resumen'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Resumen y Recomendaciones IA</span>
            {game.estado === 'finalizada' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          )}

          <button
            onClick={() => setActiveTab('coordinador')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'coordinador'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Panel del Coordinador
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        
        {/* ========================================================================= */}
        {/* TAB 1: CUPÓN DE DECISIONES + CALCULADORA PREVENTIVA EN VIVO */}
        {/* ========================================================================= */}
        {activeTab === 'cupon' && cicloCompleto && (
          <div className="max-w-2xl mx-auto bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-8 shadow-xl text-center space-y-4">
            <CheckCheck className="w-10 h-10 mx-auto text-emerald-400" />
            <h2 className="font-bold text-lg text-white">Todos los equipos guardaron sus resultados</h2>
            <p className="text-sm text-slate-400">
              {game.modoCompetitivo
                ? 'Al finalizar el ciclo se simula el mercado y se publica el ranking, sin mostrar los precios ni el marketing de cada equipo. El detalle completo se publica al terminar la partida.'
                : 'Al finalizar el ciclo se simula el mercado y se muestran los resultados de la ronda.'}
            </p>
            <button
              type="button"
              onClick={handleFinalizarCiclo}
              disabled={simulando}
              className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulando ? 'Procesando...' : 'Finalizar el ciclo'}</span>
            </button>
          </div>
        )}

        {activeTab === 'cupon' && !cicloCompleto && enCurso && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Formulario de Entrada */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="font-bold text-base text-white flex items-center gap-2">
                      Cupón de Decisiones: <span className="text-emerald-400">{activeTeam.nombre}</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Período {game.periodoActual} • Completá las decisiones de tu empresa y guardá. Al guardar, los valores se ocultan y sigue el próximo equipo.
                  </p>
                </div>

              </div>

              <div className="space-y-5">
                {/* 1. Precio y Marketing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        1. Precio de Venta ($50 a $100 u$s)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">{precio !== '' && `$${precio} u$s`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={50}
                        max={100}
                        value={precio === '' ? 50 : precio}
                        onChange={e => setPrecio(leerCampo(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={precio}
                        onChange={e => setPrecio(leerCampo(e.target.value))}
                        className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center font-bold text-emerald-400 font-mono"
                      />
                    </div>
                    {!game.modoCompetitivo && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        💡 Regla: Precios bajos captan demanda masiva. Precios altos dan margen pero exigen Marketing.
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        2. Marketing ($0 a $10.000 u$s)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">{marketing !== '' && `$${marketing.toLocaleString()}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={500}
                        value={numero(marketing)}
                        onChange={e => setMarketing(leerCampo(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        step={100}
                        value={marketing}
                        onChange={e => setMarketing(leerCampo(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center font-bold text-emerald-400 font-mono"
                      />
                    </div>
                    {!game.modoCompetitivo && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        💡 Regla: Genera visibilidad directa en la ronda actual para captar órdenes de compra.
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Nivel de Producción y Capacitación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      3. Nivel de Producción ({nivelProd === '' ? 'sin elegir' : `${nivelProd}%`})
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 25, 50, 75, 100].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setNivelProd(lvl as NivelProduccion)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            nivelProd === lvl
                              ? 'bg-emerald-400 border-emerald-300 text-emerald-950 font-extrabold shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {lvl}%
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
                      <span>Producirás: <strong>{Math.round(activeTeam.planta * 0.02 * (numero(nivelProd) / 100))} unid.</strong></span>
                      <span>Capacidad: {Math.round(activeTeam.planta * 0.02)} u.</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        4. Capacitación ($0 a $20.000)
                      </label>
                      <span className="text-[10px] text-purple-400 font-mono font-bold">{capacitacion !== '' && `$${capacitacion.toLocaleString()}`}</span>
                    </div>
                    <select
                      value={capacitacion}
                      onChange={e => setCapacitacion(leerCampo(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>Elegí un monto</option>
                      {[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000].map(val => (
                        <option key={val} value={val}>
                          ${val.toLocaleString()} {val === 0 ? '(Sin inversión)' : `(Paso ${val/2000})`}
                        </option>
                      ))}
                    </select>
                    {!game.modoCompetitivo && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        💡 Regla: Reduce el costo unitario de mano de obra en fábrica para siempre.
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Investigación y Desarrollo + Ampliación de Planta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        5. Investigación y Desarrollo (I+D)
                      </label>
                      <span className="text-[10px] text-teal-400 font-mono font-bold">{invDes !== '' && `$${invDes.toLocaleString()}`}</span>
                    </div>
                    <input
                      type="number"
                      step={500}
                      min={0}
                      value={invDes}
                      onChange={e => setInvDes(leerCampo(e.target.value))}
                      placeholder="$ Inversión en I+D"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    {!game.modoCompetitivo && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        💡 Regla: Acumulativo. Hace que los clientes elijan tu producto frente a rivales con igual precio.
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        6. Ampliación de Planta ($)
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">{amplPlanta !== '' && `+$${amplPlanta.toLocaleString()}`}</span>
                    </div>
                    <input
                      type="number"
                      step={5000}
                      min={0}
                      value={amplPlanta}
                      onChange={e => setAmplPlanta(leerCampo(e.target.value))}
                      placeholder="$ Nueva inversión en planta"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    {!game.modoCompetitivo && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        💡 Regla: Cada $5.000 amplía tu capacidad física en 100 unidades para la siguiente ronda.
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Financiamiento Bancario (Banco A y B) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Banco A */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Banco A (Corto Plazo)</span>
                      <span className="text-[10px] text-slate-400 font-mono">Tasa: {casoConfig?.config_bancos.tasa_bco_a}% anual</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">7. Pedido Préstamo A ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={pedPrestA}
                        onChange={e => setPedPrestA(leerCampo(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">8. Devolución Préstamo A ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        disabled={game.periodoActual === 0}
                        value={devPrestA}
                        onChange={e => setDevPrestA(leerCampo(e.target.value))}
                        placeholder={game.periodoActual === 0 ? "Bloqueado en P0" : "0"}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Banco B */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">Banco B (Largo Plazo)</span>
                      <span className="text-[10px] text-slate-400 font-mono">Tasa: {casoConfig?.config_bancos.tasa_bco_b}% anual</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">9. Pedido Préstamo B ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={pedPrestB}
                        onChange={e => setPedPrestB(leerCampo(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">10. Devolución Préstamo B ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        disabled={game.periodoActual === 0}
                        value={devPrestB}
                        onChange={e => setDevPrestB(leerCampo(e.target.value))}
                        placeholder={game.periodoActual === 0 ? "Bloqueado en P0" : "0"}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón Inferior para avanzar de turno */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Equipo actual: <strong className="text-emerald-400">{activeTeam.nombre}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleGuardarDecision}
                    disabled={guardandoDecision}
                    className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-40"
                  >
                    <span>{guardandoDecision ? 'Guardando...' : 'Guardar resultados'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>

            {/* CALCULADORA PREVENTIVA EN VIVO O PANEL COMPETITIVO BLOQUEADO */}
            <div className="lg:col-span-5 space-y-6">
              {game.modoCompetitivo ? (
                <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-6 shadow-xl sticky top-24 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Swords className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-white">Modo Competitivo Oficial</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                      Ayudas Bloqueadas
                    </span>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <EyeOff className="w-4 h-4" />
                      <span>Calculadora Preventiva Inhabilitada</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      En este modo de torneo o examen, <strong>no se muestran proyecciones automáticas de costos ni de flujo de fondos</strong>.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs text-slate-400">
                    <span className="font-bold text-slate-200 block uppercase tracking-wider text-[11px]">
                      Reglas del Certamen:
                    </span>
                    <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold mt-0.5">•</span>
                        <span>Deben calcular su <strong>costo unitario</strong> analizando la Matriz de Costos según su planta y capacitación acumulada.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold mt-0.5">•</span>
                        <span>El <strong>flujo de fondos</strong> debe ser estimado manualmente para no incurrir en descubierto bancario ni multas de $500.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold mt-0.5">•</span>
                        <span>Los despidos de personal generan $300 de indemnización inmediata que debe preverse en tesorería.</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center font-mono text-[11px] text-slate-400">
                    Capacidad Actual de Planta: <strong className="text-white">{Math.round(activeTeam.planta * 0.02)} unidades</strong>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      Proyección Financiera en Vivo
                    </h3>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      Calculadora Preventiva
                    </span>
                  </div>

                {calculoPreventivo ? (
                  <div className="space-y-4">
                    {/* Alerta de Giro en Descubierto */}
                    {calculoPreventivo.reporte_creditos.giro_descubierto > 0 && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">¡Alerta de Giro en Descubierto!</strong>
                          Tus fondos proyectados no cubren tus costos. Caerás en descubierto bancario por <strong>${Math.round(calculoPreventivo.reporte_creditos.giro_descubierto).toLocaleString()}</strong> con tasa punitiva.
                        </div>
                      </div>
                    )}

                    {/* Costo Unitario Proyectado */}
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Costo Unitario Proyectado</span>
                        <span className="text-[10px] text-slate-400">Según Planta ({activeTeam.planta}) y Nivel ({nivelProd}%)</span>
                      </div>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        ${calculoPreventivo.reporte_produccion.costo_unitario.toFixed(2)}
                      </span>
                    </div>

                    {/* Personal y Subsidios / Indemnizaciones */}
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Empleados Necesarios en Planta:</span>
                        <span className="font-mono font-bold text-white">
                          {calculoPreventivo.reporte_produccion.empleados} operarios
                        </span>
                      </div>

                      {calculoPreventivo.reporte_produccion.empleados_nuevos > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-400">
                          <span>Nuevas Contrataciones (Subsidio $100 c/u):</span>
                          <span className="font-mono font-bold">
                            +{calculoPreventivo.reporte_produccion.empleados_nuevos} (+${calculoPreventivo.estado_resultados.subsidios})
                          </span>
                        </div>
                      )}

                      {calculoPreventivo.reporte_produccion.empleados_despedidos > 0 && (
                        <div className="flex items-center justify-between text-xs text-rose-400">
                          <span>Despidos (Indemnización $300 c/u):</span>
                          <span className="font-mono font-bold">
                            -{calculoPreventivo.reporte_produccion.empleados_despedidos} (-${calculoPreventivo.estado_resultados.indemnizaciones})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Flujo de Fondos Proyectado */}
                    <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-slate-300 block mb-1">Estimación de Caja al Cierre de Ronda:</span>
                      
                      <div className="flex justify-between text-slate-400">
                        <span>Ingresos por Ventas Estimadas:</span>
                        <span className="font-mono text-emerald-400">+${Math.round(calculoPreventivo.estado_resultados.ventas).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Costo de Producción:</span>
                        <span className="font-mono text-slate-300">-${Math.round(calculoPreventivo.estado_resultados.costo_merc_vend).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Gastos Comerciales y de I+D:</span>
                        <span className="font-mono text-slate-300">-${(numero(marketing) + numero(invDes) + numero(capacitacion)).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Mantenimiento de Planta:</span>
                        <span className="font-mono text-slate-300">-${Math.round(calculoPreventivo.estado_resultados.mantenimiento).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Intereses Bancarios:</span>
                        <span className="font-mono text-rose-400">-${Math.round(calculoPreventivo.estado_resultados.intereses).toLocaleString()}</span>
                      </div>

                      <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-sm">
                        <span>Efectivo Proyectado Final:</span>
                        <span className={`font-mono ${calculoPreventivo.balance.efectivo < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${Math.round(calculoPreventivo.balance.efectivo).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Capacidad Futura */}
                    <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs space-y-1">
                      <span className="font-semibold text-indigo-300 block">Evolución para el Período {game.periodoActual + 1}:</span>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Nueva Capacidad de Planta:</span>
                        <strong className="text-white">{calculoPreventivo.proximo_periodo.capacidad} unidades</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Capacitación Acumulada:</span>
                        <strong className="text-purple-400">${calculoPreventivo.proximo_periodo.capacitacion_acumulada.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Completá el precio y el nivel de producción para ver la proyección.
                  </div>
                )}
              </div>
            )}
          </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REPORTE FINANCIERO OFICIAL */}
        {/* ========================================================================= */}
        {activeTab === 'reporte' && (
          <div className="space-y-6">
            
            {/* Selector de Equipo para ver Reporte */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Visualizar Reporte Contable de:</h3>
                  <p className="text-xs text-slate-400">Seleccioná qué equipo querés auditar contablemente.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {game.teams.map((team: any, idx: number) => {
                  const isSelected = team.id === selectedReportTeamId;

                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedReportTeamId(team.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shrink-0 ${
                        isSelected
                          ? `bg-cyan-500/20 text-white border-cyan-500 ring-2 ring-cyan-500/40`
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {team.esHumano ? (
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>{team.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contenido del Reporte */}
            {ultimoReporte && ultimoReporte.resultados_equipos[activeReportTeam.id] ? (
              (() => {
                const rep = ultimoReporte.resultados_equipos[activeReportTeam.id];
                return (
                  <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-2">
                        <div>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                            Estados Contables Oficiales • Estructura Histórica
                          </span>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                            Reporte del Período {ultimoReporte.periodo}: <span className="text-cyan-400">{activeReportTeam.nombre}</span>
                          </h2>
                        </div>
                        <div className="text-right font-mono text-xs text-slate-400">
                          <span>Precio: <strong>${rep.decisiones.precio} u$s</strong></span> • 
                          <span className="ml-2">Marketing: <strong>${rep.decisiones.marketing.toLocaleString()}</strong></span>
                        </div>
                      </div>

                      {/* Grilla Contable 2x2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. ESTADO DE RESULTADOS */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
                          <h3 className="font-bold text-sm text-cyan-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                            <span>ESTADO DE RESULTADOS</span>
                            <span className="text-[10px] text-slate-400 font-normal">Período {ultimoReporte.periodo}</span>
                          </h3>

                          <div className="space-y-1.5">
                            <div className="flex justify-between font-semibold text-white">
                              <span>Ventas ({rep.reporte_comercial.ventas_realizadas} u. x ${rep.reporte_comercial.precio})</span>
                              <span className="text-emerald-400">${rep.estado_resultados.ventas.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>(-) Costo de Mercaderías Vendidas (CMV)</span>
                              <span>-${rep.estado_resultados.costo_merc_vend.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-200 border-t border-slate-800 pt-1">
                              <span>(=) Margen Bruto</span>
                              <span className="text-emerald-400">${rep.estado_resultados.margen_bruto.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-emerald-400/90 pt-1">
                              <span>(+) Subsidios por Empleo ({rep.reporte_produccion.empleados_nuevos} emp.)</span>
                              <span>+${rep.estado_resultados.subsidios.toLocaleString()}</span>
                            </div>

                            <div className="pt-2 text-slate-400 space-y-1">
                              <div className="flex justify-between">
                                <span>(-) Marketing</span>
                                <span>-${rep.estado_resultados.marketing.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>(-) Mantenimiento de Planta</span>
                                <span>-${rep.estado_resultados.mantenimiento.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>(-) Capacitación</span>
                                <span>-${rep.estado_resultados.capacitacion.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>(-) Investigación y Desarrollo</span>
                                <span>-${rep.estado_resultados.inv_des.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-rose-400">
                                <span>(-) Indemnizaciones ({rep.reporte_produccion.empleados_despedidos} emp.)</span>
                                <span>-${rep.estado_resultados.indemnizaciones.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-amber-400">
                                <span>(-) Mantenimiento de Stock</span>
                                <span>-${rep.estado_resultados.mantenimiento_stock.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-rose-400">
                                <span>(-) Intereses Bancarios</span>
                                <span>-${rep.estado_resultados.intereses.toLocaleString()}</span>
                              </div>
                              {rep.estado_resultados.penalidad > 0 && (
                                <div className="flex justify-between text-rose-500 font-bold">
                                  <span>(-) Multa Giro en Descubierto</span>
                                  <span>-${rep.estado_resultados.penalidad.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-slate-200">
                              <span>Utilidad antes de Impuestos</span>
                              <span className={rep.estado_resultados.util_antes_imp < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                ${rep.estado_resultados.util_antes_imp.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>(-) Impuestos a las Ganancias</span>
                              <span>-${rep.estado_resultados.impuestos.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-emerald-500/40 pt-2 flex justify-between font-bold text-sm bg-slate-800/40 p-2 rounded-lg">
                              <span className="text-white">Utilidad Neta del Período</span>
                              <span className={rep.estado_resultados.util_periodo < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                ${rep.estado_resultados.util_periodo.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. ESTADO PATRIMONIAL (BALANCE GENERAL) */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
                          <h3 className="font-bold text-sm text-emerald-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                            <span>BALANCE GENERAL</span>
                            <span className="text-[10px] text-slate-400 font-normal">Al Cierre del Período</span>
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <span className="font-bold text-slate-300 block mb-1">ACTIVO</span>
                              <div className="space-y-1 text-slate-400 pl-2">
                                <div className="flex justify-between">
                                  <span>Efectivo en Caja</span>
                                  <span className={rep.balance.efectivo < 0 ? 'text-rose-400 font-bold' : 'text-white'}>
                                    ${rep.balance.efectivo.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Stock de Productos ({rep.reporte_comercial.stock_unidades} u.)</span>
                                  <span className="text-white">${rep.balance.stock_valorizado.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Planta Fabril</span>
                                  <span className="text-white">${rep.balance.planta.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-emerald-400 text-xs">
                                  <span>TOTAL DEL ACTIVO</span>
                                  <span>${rep.balance.total_activo.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <span className="font-bold text-slate-300 block mb-1">PASIVO Y PATRIMONIO NETO</span>
                              <div className="space-y-1 text-slate-400 pl-2">
                                <div className="flex justify-between">
                                  <span>Préstamos Tomados</span>
                                  <span className="text-white">${rep.balance.prestamos_tomados.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Capital Social</span>
                                  <span className="text-white">${rep.balance.capital.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Utilidad Acumulada</span>
                                  <span className={rep.balance.util_acumulada < 0 ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
                                    ${rep.balance.util_acumulada.toLocaleString()}
                                  </span>
                                </div>
                                <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-emerald-400 text-xs">
                                  <span>TOTAL PASIVO + PATRIMONIO</span>
                                  <span>${rep.balance.pasivo_patrimonio.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Verificación Cuadre Contable */}
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-bold">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Cuadre Contable:
                              </span>
                              <span>Total Activo == Pasivo + PN (100% Exacto)</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h3 className="font-bold text-base text-slate-300 mb-1">Sin Reportes Contables Previos</h3>
                <p className="text-xs max-w-md mx-auto mb-4">
                  Aún no se ha simulado ninguna ronda para esta partida. Completá el cupón de decisiones y hacé clic en "Simular Ronda" para generar el primer balance.
                </p>
                <button
                  onClick={() => setActiveTab('cupon')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Ir al Cupón de Decisiones
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MERCADO Y RANKING */}
        {/* ========================================================================= */}
        {activeTab === 'mercado' && (
          <div className="space-y-6">
            {enCurso && ultimoReporte && (
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab('cupon')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
                >
                  <span>Continuar con el Período {game.periodoActual}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {ultimoReporte ? (
              <>
                {/* Ranking del Mercado */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        Tabla de Posiciones del Mercado (Período {ultimoReporte.periodo})
                      </h2>
                      <p className="text-xs text-slate-400">
                        Total Unidades Vendidas: <strong className="text-emerald-400">{ultimoReporte.total_mercado_unidades.toLocaleString()} u.</strong>
                        {!resultadosOcultos && <> • Precio Promedio: <strong className="text-white">${ultimoReporte.precio_promedio.toFixed(2)} u$s</strong></>}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 self-start sm:self-auto">
                      Criterio: Mayor Utilidad Acumulada
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3 rounded-l-xl">Pos</th>
                          <th className="py-3 px-3">Equipo</th>
                          {!resultadosOcultos && <th className="py-3 px-3 text-right">Precio</th>}
                          {!resultadosOcultos && <th className="py-3 px-3 text-right">Marketing</th>}
                          {!resultadosOcultos && <th className="py-3 px-3 text-right">Órdenes</th>}
                          <th className="py-3 px-3 text-right">Ventas</th>
                          <th className="py-3 px-3 text-right">Cuota %</th>
                          <th className="py-3 px-3 text-right">Util. Período</th>
                          <th className="py-3 px-3 text-right rounded-r-xl">Util. Acumulada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {ultimoReporte.ranking.map((item, idx) => {
                          const isHuman = humanTeams.some((t: any) => t.id === item.equipo_id);
                          const isSelected = item.equipo_id === selectedTeamId;

                          return (
                            <tr
                              key={item.equipo_id}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500/10 font-bold'
                                  : isHuman
                                    ? 'bg-cyan-500/5 hover:bg-slate-800/40'
                                    : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="py-3 px-3 font-bold">
                                {idx === 0 && <span className="text-amber-400">🥇 1°</span>}
                                {idx === 1 && <span className="text-slate-300">🥈 2°</span>}
                                {idx === 2 && <span className="text-amber-600">🥉 3°</span>}
                                {idx > 2 && <span className="text-slate-500">#{idx + 1}</span>}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {isHuman ? (
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold text-[9px] uppercase">
                                      Alumnos
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[9px] uppercase">
                                      Bot IA
                                    </span>
                                  )}
                                  <span className={isHuman ? 'font-bold text-white' : 'text-slate-300'}>
                                    {item.nombre}
                                  </span>
                                </div>
                              </td>
                              {!resultadosOcultos && (
                                <>
                                  <td className="py-3 px-3 text-right font-bold text-white">${item.precio}</td>
                                  <td className="py-3 px-3 text-right text-slate-300">${item.marketing.toLocaleString()}</td>
                                  <td className="py-3 px-3 text-right text-slate-300">{item.ordenes_recibidas} u.</td>
                                </>
                              )}
                              <td className="py-3 px-3 text-right font-bold text-white">{item.ventas_unidades} u.</td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-400">{item.cuota_mercado_pct.toFixed(1)}%</td>
                              <td className={`py-3 px-3 text-right font-bold ${item.utilidad_periodo < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ${Math.round(item.utilidad_periodo).toLocaleString()}
                              </td>
                              <td className={`py-3 px-3 text-right font-bold ${item.utilidad_acumulada < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                                ${Math.round(item.utilidad_acumulada).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Estrategias de los Bots de IA */}
                {botTeams.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      Análisis Estratégico de la Competencia (Bots de IA)
                    </h3>
                    {game.modoCompetitivo && game.estado !== 'finalizada' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                        <Swords className="w-3 h-3" /> Modo Competitivo
                      </span>
                    )}
                  </div>

                  {game.modoCompetitivo && game.estado !== 'finalizada' ? (
                    <div className="p-6 bg-slate-800/30 border border-amber-500/20 rounded-xl text-center space-y-2">
                      <EyeOff className="w-8 h-8 text-amber-400/80 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-200">Estrategias Confidenciales durante la Competencia</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        En Modo Competitivo, las decisiones tácticas y justificaciones internas de los competidores permanecen ocultas para preservar la confidencialidad de mercado. Se revelarán al finalizar el certamen.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400 mb-4">
                        Comprende qué lógica pensó cada bot rival durante la última simulación:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {botTeams.map((bot: any) => {
                          const dec = bot.decisions?.find((d: any) => d.periodo === ultimoReporte?.periodo);
                          return (
                            <div key={bot.id} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                                  <Bot className="w-4 h-4 text-purple-400" />
                                  {bot.nombre}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase">
                                  {bot.personalidad || 'IA'}
                                </span>
                              </div>

                              {dec?.razonamiento ? (
                                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                  "{dec.razonamiento}"
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Siguió su perfil estratégico de {bot.personalidad}.
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                                <span>Precio: <strong>${dec?.precio || 89}</strong></span>
                                <span>Mkt: <strong>${dec?.marketing || 7000}</strong></span>
                                <span>Prod: <strong>{dec?.nivelProd || 75}%</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                )}
              </>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <Trophy className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h3 className="font-bold text-base text-slate-300 mb-1">Sin Datos de Mercado</h3>
                <p className="text-xs max-w-md mx-auto mb-4">
                  La tabla de posiciones se generará automáticamente en cuanto se simule el Período {game.periodoActual}.
                </p>
                <button
                  onClick={() => setActiveTab('cupon')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Ir al Cupón de Decisiones
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RESUMEN HISTÓRICO Y RECOMENDACIONES IA (COACH) */}
        {/* ========================================================================= */}
        {activeTab === 'resumen' && (
          <div className="space-y-8">
            
            {/* Banner de Estado de la Partida & Podio */}
            <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Trophy className="w-6 h-6" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Certamen de Negocios • {game.estado === 'finalizada' ? 'Resultados Finales' : 'Balance Acumulado'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    {game.estado === 'finalizada' ? '🏆 Gran Final y Proclamación de Ganadores' : 'Resumen Histórico de Decisiones'}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Revisá el camino estratégico de cada equipo a lo largo de las rondas y consultá la devolución del Director Financiero IA para descubrir dónde ganaron o perdieron dinero.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {game.estado !== 'finalizada' && (
                    <button
                      onClick={handleFinalizarPartida}
                      disabled={finalizando || game.periodoActual === 0}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      <Flag className="w-4 h-4" />
                      <span>{finalizando ? 'Finalizando...' : 'Finalizar Partida'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Podio Olímpico de Equipos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {rankingFinalEquipos.slice(0, 3).map((team, idx) => {
                  const placeConfig = [
                    { label: 'Campeón 1° Puesto', icon: '🥇', border: 'border-amber-500/60', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                    { label: 'Subcampeón 2° Puesto', icon: '🥈', border: 'border-slate-400/60', bg: 'bg-slate-400/10', text: 'text-slate-300' },
                    { label: '3° Puesto', icon: '🥉', border: 'border-amber-700/60', bg: 'bg-amber-700/10', text: 'text-amber-600' }
                  ][idx];

                  return (
                    <div 
                      key={team.id}
                      className={`p-4 rounded-xl border ${placeConfig.border} ${placeConfig.bg} space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{placeConfig.icon}</span>
                        <span className={`text-[10px] font-mono font-bold uppercase ${placeConfig.text}`}>
                          {placeConfig.label}
                        </span>
                      </div>
                      <div className="font-bold text-base text-white truncate">
                        {team.nombre}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono pt-1">
                        <span className="text-slate-400">Utilidad Acumulada:</span>
                        <span className={`font-bold ${team.utilidadAcumulada < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${Math.round(team.utilidadAcumulada).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 1: AUDITORÍA Y FEEDBACK CON IA  */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base text-white">
                      Auditoría Financiera y Recomendaciones de IA
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Análisis pedagógico profundo de decisiones comerciales, errores costosos y plan de acción.
                  </p>
                </div>

                {/* Selector de Equipo para auditar */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFeedbackTeamId}
                    onChange={e => {
                      const tid = e.target.value;
                      setSelectedFeedbackTeamId(tid);
                      const t = game.teams.find((tm: any) => tm.id === tid);
                      if (t?.feedbackJson) {
                        try {
                          setFeedbackData(JSON.parse(t.feedbackJson));
                        } catch {
                          setFeedbackData(null);
                        }
                      } else {
                        setFeedbackData(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {game.teams.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        Auditar: {t.nombre} {t.esHumano ? '(Alumnos)' : '(IA)'}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleGenerarFeedback(selectedFeedbackTeamId)}
                    disabled={generandoFeedback}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {generandoFeedback ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generar devolución</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Render del Feedback */}
              {feedbackData ? (
                <div className="space-y-6">
                  
                  {/* Tarjeta de Calificación y Resumen Ejecutivo */}
                  <div className="p-6 bg-slate-800/40 border border-slate-700/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${
                          ['A+', 'A'].includes(feedbackData.calificacion_gestion)
                            ? 'bg-emerald-400 text-emerald-950 shadow-emerald-500/20'
                            : feedbackData.calificacion_gestion === 'B'
                              ? 'bg-cyan-400 text-cyan-950 shadow-cyan-500/20'
                              : feedbackData.calificacion_gestion === 'C'
                                ? 'bg-amber-400 text-amber-950 shadow-amber-500/20'
                                : 'bg-rose-500 text-white shadow-rose-500/20'
                        }`}>
                          {feedbackData.calificacion_gestion}
                        </span>
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                            Calificación de Gestión Empresarial
                          </span>
                          <h4 className="font-bold text-base text-white">
                            {feedbackData.titulo_diagnostico}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        {feedbackData.resumen_ejecutivo}
                      </p>
                    </div>

                    <div className="shrink-0 font-mono text-xs text-slate-400 border-l border-slate-700/60 pl-6 space-y-1.5 hidden md:block">
                      <div>Posición Final: <strong className="text-white">#{feedbackData.metricas_clave.posicion_final} de {feedbackData.metricas_clave.total_equipos}</strong></div>
                      <div>Utilidad Acumulada: <strong className="text-emerald-400">${feedbackData.metricas_clave.utilidad_acumulada_final.toLocaleString()}</strong></div>
                      <div>Ventas Totales: <strong className="text-white">{feedbackData.metricas_clave.unidades_totales_vendidas.toLocaleString()} u.</strong></div>
                      <div>Facturación: <strong className="text-white">${feedbackData.metricas_clave.facturacion_total.toLocaleString()}</strong></div>
                      <div>Eficiencia Operativa: <strong className="text-cyan-400">{feedbackData.metricas_clave.tasa_eficiencia_operativa_pct}%</strong></div>
                      <div className="text-[10px] text-slate-500 pt-1">
                        Motor: {feedbackData.origen === 'heuristico' ? 'Auditor Experto Heurístico' : 'Inteligencia Artificial'}
                      </div>
                    </div>
                  </div>

                  {/* Grilla 3 Columnas: Puntos Fuertes, Errores Críticos y Oportunidades */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Puntos Fuertes */}
                    <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCheck className="w-4 h-4" />
                        <span>Puntos Fuertes y Aciertos</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {feedbackData.puntos_fuertes.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Errores Críticos / Fugas de Dinero */}
                    <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4" />
                        <span>Errores y Dinero Perdido</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {feedbackData.errores_criticos.map((err, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Oportunidades Perdidas */}
                    <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Oportunidades Perdidas</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {feedbackData.oportunidades_perdidas.map((op, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{op}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Plan de Acción y Consejos para el Próximo Torneo */}
                  <div className="p-6 bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-800/40 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                      <BookOpen className="w-5 h-5 text-teal-400" />
                      <span>Plan de Acción y Recomendaciones para el Próximo Torneo</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                      {feedbackData.recomendaciones_estrategicas.map((rec, i) => (
                        <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-3">
                  <Brain className="w-10 h-10 mx-auto text-slate-600" />
                  <h4 className="font-bold text-sm text-slate-300">Sin Auditoría Generada Aún</h4>
                  <p className="text-xs max-w-md mx-auto text-slate-400">
                    Hacé clic en "Generar devolución" para que la inteligencia artificial audite el historial contable completo de "{activeFeedbackTeam.nombre}" y te diga cómo mejorar.
                  </p>
                  <button
                    onClick={() => handleGenerarFeedback(selectedFeedbackTeamId)}
                    disabled={generandoFeedback}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                  >
                    Generar Auditoría Ahora
                  </button>
                </div>
              )}

            </div>

            {/* SECCIÓN 2: MATRIZ HISTÓRICA DE DECISIONES DE TODAS LAS RONDAS */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Historial Completo de Decisiones Ronda por Ronda
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspeccioná la evolución de las 10 decisiones tomadas por cada equipo a lo largo del certamen.
                  </p>
                </div>
              </div>

              {/* Selector de Equipo para ver historial */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                {game.teams.map((tm: any) => (
                  <button
                    key={tm.id}
                    onClick={() => setSelectedFeedbackTeamId(tm.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                      tm.id === selectedFeedbackTeamId
                        ? 'bg-cyan-500/20 text-white border-cyan-500 ring-2 ring-cyan-500/40'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tm.nombre}
                  </button>
                ))}
              </div>

              {/* Tabla de Decisiones Históricas */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Ronda</th>
                      <th className="py-2.5 px-3 text-right">Precio</th>
                      <th className="py-2.5 px-3 text-right">Marketing</th>
                      <th className="py-2.5 px-3 text-right">Prod %</th>
                      <th className="py-2.5 px-3 text-right">Capacit.</th>
                      <th className="py-2.5 px-3 text-right">I+D</th>
                      <th className="py-2.5 px-3 text-right">Ampl. Planta</th>
                      <th className="py-2.5 px-3 text-right">Prést. A</th>
                      <th className="py-2.5 px-3 text-right">Prést. B</th>
                      <th className="py-2.5 px-3 text-right rounded-r-xl">Devoluciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeFeedbackTeam.decisions && activeFeedbackTeam.decisions.length > 0 ? (
                      activeFeedbackTeam.decisions.map((dec: any) => (
                        <tr key={dec.periodo} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-emerald-400">
                            Período {dec.periodo}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">${dec.precio}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">${dec.marketing.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-cyan-400">{dec.nivelProd}%</td>
                          <td className="py-2.5 px-3 text-right text-purple-400">${dec.capacitacion.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-teal-400">${dec.invDes.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {dec.amplPlanta > 0 ? `+$${dec.amplPlanta.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-400">
                            {dec.pedPrestA > 0 ? `$${dec.pedPrestA.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-cyan-400">
                            {dec.pedPrestB > 0 ? `$${dec.pedPrestB.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            ${(dec.devPrestA + dec.devPrestB).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-slate-500">
                          No hay decisiones registradas aún para este equipo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PANEL DEL COORDINADOR (TFMODIFICARDATOS) */}
        {/* ========================================================================= */}
        {activeTab === 'coordinador' && (
          <div className="max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold tracking-wider block">
                Herramienta Exclusiva para el Docente • Equivalente a TFMODIFICARDATOS
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                Editor Macroeconómico en Vivo (Período {game.periodoActual})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Modificá las reglas macroeconómicas, tasas de interés y penalidades para simular shocks sorpresivos entre rondas.
              </p>
            </div>

            {/* Control de Modo: Práctica vs Competitivo */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              game.modoCompetitivo 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  game.modoCompetitivo 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      Modo Actual: {game.modoCompetitivo ? '🔥 Modo Competitivo (Sin Ayudas)' : '🎓 Modo Práctica (Con Asistencias)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {game.modoCompetitivo 
                      ? 'La calculadora en vivo está apagada, las pistas de reglas están ocultas y el razonamiento de la IA es confidencial.' 
                      : 'Los alumnos disponen de calculadora preventiva en vivo, pistas de rangos y análisis didáctico.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleModoCompetitivo}
                disabled={game.periodoActual > 0 || equiposListosCount > 0}
                title="El modo solo se puede cambiar antes de que algún equipo cargue sus decisiones"
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2 disabled:opacity-40 ${
                  game.modoCompetitivo
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-500/20'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>{game.modoCompetitivo ? 'Cambiar a Modo Práctica' : 'Activar Modo Competitivo'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bancos y Tasas */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tasas de Interés y Crédito</h3>
                
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tasa Banco A (Anual %)</label>
                    <input
                      type="number"
                      value={editorTasaA}
                      onChange={e => setEditorTasaA(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tasa Banco B (Anual %)</label>
                    <input
                      type="number"
                      value={editorTasaB}
                      onChange={e => setEditorTasaB(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tope Máximo Crédito Banco A ($)</label>
                    <input
                      type="number"
                      step={5000}
                      value={editorMaxCredA}
                      onChange={e => setEditorMaxCredA(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tope Máximo Crédito Banco B ($)</label>
                    <input
                      type="number"
                      step={5000}
                      value={editorMaxCredB}
                      onChange={e => setEditorMaxCredB(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Parámetros Operativos */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Costos Operativos y Demanda</h3>
                
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tasa Mantenimiento de Planta (% s/planta)</label>
                    <input
                      type="number"
                      value={editorMantenimiento}
                      onChange={e => setEditorMantenimiento(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Penalidad por Stock Remanente ($/unid)</label>
                    <input
                      type="number"
                      value={editorPenalidadStock}
                      onChange={e => setEditorPenalidadStock(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Impuesto a las Ganancias (%)</label>
                    <input
                      type="number"
                      value={editorImpuestos}
                      onChange={e => setEditorImpuestos(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Modificador de Demanda Total (%)</label>
                    <input
                      type="number"
                      value={editorFactorDemanda}
                      onChange={e => setEditorFactorDemanda(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">55% = Demanda Alta Clásica (Fiel al original)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleEliminarEstaPartida}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar esta Partida Definitivamente</span>
              </button>

              <button
                type="button"
                onClick={handleGuardarConfiguracionCaso}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all self-end sm:self-auto"
              >
                Guardar Modificaciones del Caso
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR NUEVO EQUIPO DE ALUMNOS */}
      {/* ========================================================================= */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddTeamModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Plus className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Sumar Nuevo Equipo de Alumnos</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              El nuevo equipo se incorporará a la partida actual con el capital y planta iniciales ($70.000 y $50.000) listo para participar en el Período {game.periodoActual}.
            </p>

            <form onSubmit={handleCrearNuevoEquipo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nombre de la Empresa o Grupo
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nuevoEquipoNombre}
                  onChange={e => setNuevoEquipoNombre(e.target.value)}
                  placeholder="Ej. Equipo Delta (Grupo 4)"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoEquipo}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {creandoEquipo ? 'Creando...' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GUÍA DIDÁCTICA PARA ALUMNOS */}
      {/* ========================================================================= */}
      {showDidacticModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowDidacticModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <BookOpen className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Guía Didáctica para Alumnos</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Conceptos clave para dominar la toma de decisiones y liderar el mercado empresarial:
            </p>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> 1. Precio y Demanda Relativa
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  El simulador calcula el <strong>precio promedio de mercado</strong> de todos los equipos. Si tu precio es menor al promedio, ganarás participación de mercado rápidamente. Si tu precio es mayor, ganarás más margen por unidad vendida, pero tendrás menos clientes a menos que inviertas fuertemente en Marketing e I+D.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-teal-400 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 2. Marketing vs. Investigación y Desarrollo (I+D)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  El <strong>Marketing</strong> tiene un efecto inmediato en la ronda actual para captar órdenes. El <strong>I+D</strong> se acumula ronda a ronda: a mayor I+D acumulado respecto a tus competidores, más clientes preferirán tu producto incluso si no sos el más barato.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> 3. Nivel de Producción y Capacitación
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Tu fábrica produce según el tamaño de tu planta física multiplicado por el nivel de utilización (25%, 50%, 75% o 100%). Cada $2.000 en <strong>Capacitación</strong> reduce el costo unitario de mano de obra en fábrica para siempre.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> 4. Peligro: Giro en Descubierto y Multas
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Si tus egresos (costos de producción, marketing, mantenimiento e inversiones) superan tu efectivo en caja más las ventas, el banco cubrirá el saldo en <strong>Giro en Descubierto</strong> a una tasa altísima del 18% anual. Si sobrepasás el límite de descubierto ($10.000), recibirás una <strong>multa punitiva de $500</strong>.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDidacticModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
              >
                Entendido, ¡A jugar!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
