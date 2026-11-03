'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  TrendingUp, 
  Bot, 
  Users, 
  Play, 
  Settings, 
  Award, 
  Sparkles, 
  ChevronRight, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  ArrowRight,
  Plus,
  Trash2,
  GraduationCap,
  CheckCircle2,
  HelpCircle,
  Clock,
  Compass,
  Swords,
  Wifi,
  Monitor,
  LogIn
} from 'lucide-react';
import { CASOS_PREDEFINIDOS } from '@/lib/engine/cases';
import { PersonalidadBot } from '@/lib/engine/bots';

export default function LobbyPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  // Formulario de nueva partida
  const [nombrePartida, setNombrePartida] = useState('');
  const [modo, setModo] = useState<'certamen' | 'vs-ai'>('certamen');
  const [modoCompetitivo, setModoCompetitivo] = useState<boolean>(false);
  const [dispositivos, setDispositivos] = useState<'multiple' | 'unico'>('multiple');
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [casoSeleccionado, setCasoSeleccionado] = useState('clasico-alta');
  const [nombreEmpresa, setNombreEmpresa] = useState('Acme Corp S.A.');
  
  // Equipos de alumnos para el modo por turnos
  const [equiposAlumnos, setEquiposAlumnos] = useState<string[]>([
    'Equipo Alfa (Grupo 1)',
    'Equipo Beta (Grupo 2)',
    'Equipo Gamma (Grupo 3)'
  ]);
  const [nuevoNombreEquipo, setNuevoNombreEquipo] = useState('');
  const [incluirBotsEnCertamen, setIncluirBotsEnCertamen] = useState(false);

  const [botsSeleccionados, setBotsSeleccionados] = useState<PersonalidadBot[]>([
    'agresivo',
    'premium',
    'conservador'
  ]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (Array.isArray(data)) {
        setGames(data);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPartida = async (e: React.MouseEvent, gameId: string, nombre: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Eliminar definitivamente la partida "${nombre}" y todos sus registros históricos?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      if (res.ok) {
        setGames(prev => prev.filter(g => g.id !== gameId));
      } else {
        alert('Error al eliminar la partida');
      }
    } catch (err) {
      alert('Error de red al eliminar la partida');
    }
  };

  const handleAgregarEquipo = () => {
    const nombre = nuevoNombreEquipo.trim() || `Equipo ${equiposAlumnos.length + 1}`;
    if (!equiposAlumnos.includes(nombre)) {
      setEquiposAlumnos([...equiposAlumnos, nombre]);
      setNuevoNombreEquipo('');
    }
  };

  const handleEliminarEquipo = (idx: number) => {
    if (equiposAlumnos.length > 2) {
      setEquiposAlumnos(equiposAlumnos.filter((_, i) => i !== idx));
    } else {
      alert('Se requieren al menos 2 equipos para simular un mercado competitivo.');
    }
  };

  const handleModificarNombreEquipo = (idx: number, nuevoNombre: string) => {
    const updated = [...equiposAlumnos];
    updated[idx] = nuevoNombre;
    setEquiposAlumnos(updated);
  };

  const handleCrearPartida = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      const botsPayload = modo === 'vs-ai' 
        ? botsSeleccionados 
        : (incluirBotsEnCertamen ? botsSeleccionados : []);

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombrePartida || (modo === 'certamen' ? `Torneo Alumnos ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : `Simulación Individual ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`),
          modo,
          casoId: casoSeleccionado,
          nombreEmpresa,
          equiposAlumnos: modo === 'certamen' && dispositivos === 'unico' ? equiposAlumnos : undefined,
          dispositivos: modo === 'certamen' ? dispositivos : 'unico',
          personalidadesBots: botsPayload,
          modoCompetitivo
        })
      });

      if (!res.ok) {
        throw new Error('Error al crear partida');
      }

      const game = await res.json();
      router.push(`/game/${game.id}`);
    } catch (err) {
      alert('Error al inicializar la partida. Intenta nuevamente.');
    } finally {
      setCreando(false);
    }
  };

  const handleUnirse = (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = codigoUnirse.trim().toUpperCase();
    if (codigo) router.push(`/unirse/${encodeURIComponent(codigo)}`);
  };

  const toggleBot = (perso: PersonalidadBot) => {
    if (botsSeleccionados.includes(perso)) {
      if (botsSeleccionados.length > 1) {
        setBotsSeleccionados(botsSeleccionados.filter(b => b !== perso));
      }
    } else {
      setBotsSeleccionados([...botsSeleccionados, perso]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                SIMULANDO <span className="text-emerald-400">EMPRENDEDORES</span>
              </span>
              <span className="text-[10px] block font-mono text-emerald-400/80 -mt-0.5 font-semibold uppercase tracking-wider">
                Simulador de Gestión Empresarial • Versión Educativa
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-400">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Simulador para Alumnos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulario de Configuración de Partida */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Configurar Nueva Simulación
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Elegí si los alumnos competirán entre sí por turnos o de forma individual contra bots de Inteligencia Artificial.
              </p>
            </div>

            <form onSubmit={handleCrearPartida} className="space-y-6">
              {/* Selector de Modo de Juego */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. Modalidad de Participación
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModo('certamen')}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                      modo === 'certamen'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <Users className={`w-5 h-5 ${modo === 'certamen' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="font-bold text-sm">Alumnos por Turnos</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        Recomendado Aula
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Varios equipos de alumnos compiten entre sí en el mismo mercado, cada uno desde su dispositivo o por turnos en una computadora.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModo('vs-ai')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      modo === 'vs-ai'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <Bot className={`w-5 h-5 ${modo === 'vs-ai' ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className="font-bold text-sm">Práctica vs Bots IA</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Un único alumno o grupo contra 3 o más oponentes automáticos con personalidades estratégicas (dumping, premium, etc.).
                    </p>
                  </button>
                </div>
              </div>

              {/* Título de la Partida */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Título de la Partida o Curso
                </label>
                <input
                  type="text"
                  value={nombrePartida}
                  onChange={e => setNombrePartida(e.target.value)}
                  placeholder="Ej. Administración Financiera - Turno Noche 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Cómo se conectan los equipos */}
              {modo === 'certamen' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    ¿Cómo van a jugar?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDispositivos('multiple')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        dispositivos === 'multiple'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold text-sm flex items-center gap-2 mb-1.5">
                        <Wifi className="w-4 h-4" />
                        Cada equipo en su dispositivo
                      </span>
                      <span className="text-xs text-slate-400 leading-relaxed block">
                        Recibís un código para compartir y cada equipo se une online, sin crear cuentas.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispositivos('unico')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        dispositivos === 'unico'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold text-sm flex items-center gap-2 mb-1.5">
                        <Monitor className="w-4 h-4" />
                        Una sola computadora
                      </span>
                      <span className="text-xs text-slate-400 leading-relaxed block">
                        Los equipos cargan por turnos en la misma pantalla. Ideal para practicar antes de un certamen.
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECCIÓN MODO CERTAMEN: EQUIPOS DE ALUMNOS */}
              {modo === 'certamen' && (
                <div className="bg-slate-800/30 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        {dispositivos === 'multiple' ? '2. Equipos de Alumnos' : `2. Equipos de Alumnos Participantes (${equiposAlumnos.length})`}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {dispositivos === 'multiple'
                          ? 'Cada equipo elige su nombre al unirse con el código de la partida.'
                          : 'Cada equipo tendrá su turno para ingresar precio, marketing, producción y finanzas.'}
                      </p>
                    </div>
                  </div>

                  {dispositivos === 'unico' && (
                  <>
                  {/* Lista de Equipos */}
                  <div className="space-y-2">
                    {equiposAlumnos.map((eqNombre, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 p-2.5 rounded-xl group transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          required
                          value={eqNombre}
                          onChange={e => handleModificarNombreEquipo(idx, e.target.value)}
                          className="flex-1 bg-transparent border-0 text-sm font-medium text-white focus:outline-none focus:ring-0"
                          placeholder={`Nombre del Equipo ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleEliminarEquipo(idx)}
                          disabled={equiposAlumnos.length <= 2}
                          className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                          title="Eliminar equipo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Input para agregar otro equipo */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={nuevoNombreEquipo}
                      onChange={e => setNuevoNombreEquipo(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEquipo(); } }}
                      placeholder="Nombre del nuevo equipo (ej. Grupo 4 - Titanes)..."
                      className="flex-1 px-3 py-2 bg-slate-900/60 border border-dashed border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarEquipo}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Equipo</span>
                    </button>
                  </div>
                  </>
                  )}

                  {/* Toggle para sumar también bots */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incluirBotsEnCertamen}
                        onChange={e => setIncluirBotsEnCertamen(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4"
                      />
                      <span>Sumar también rivales automáticos de Inteligencia Artificial</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Modo Híbrido</span>
                  </div>
                </div>
              )}

              {/* SECCIÓN MODO VS-AI: NOMBRE DE LA EMPRESA */}
              {modo === 'vs-ai' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    2. Nombre de tu Compañía
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={nombreEmpresa}
                      onChange={e => setNombreEmpresa(e.target.value)}
                      placeholder="Ej. Nova Corp S.A."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Selección del Caso Macroeconómico */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>3. Escenario Macroeconómico Inicial ("Caso")</span>
                  <span className="text-[11px] text-slate-400 lowercase font-normal">Editable ronda a ronda por el docente</span>
                </label>
                <div className="space-y-2">
                  {CASOS_PREDEFINIDOS.map(caso => {
                    const isSelected = casoSeleccionado === caso.id;
                    const diffColors = {
                      Facil: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      Media: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      Dificil: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                      Extrema: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    };

                    return (
                      <div
                        key={caso.id}
                        onClick={() => setCasoSeleccionado(caso.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30'
                            : 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm flex items-center gap-2">
                            {caso.id === 'crisis-inflacionaria' && <Flame className="w-4 h-4 text-orange-400" />}
                            {caso.id === 'crisis-sobrestock' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                            {caso.nombre}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${diffColors[caso.dificultad as keyof typeof diffColors] || 'text-slate-400'}`}>
                            {caso.dificultad}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-snug">{caso.descripcion}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selección de Bots de IA (si aplica) */}
              {(modo === 'vs-ai' || incluirBotsEnCertamen) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    4. Rivales de IA en el Mercado ({botsSeleccionados.length} seleccionados)
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Personalidades estratégicas que competirán por las órdenes de compra:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'agresivo' as PersonalidadBot, label: 'Dumping Corp', tag: 'Dumping', desc: 'Precios bajos y producción 100%' },
                      { id: 'premium' as PersonalidadBot, label: 'Luxe Innovations', tag: 'Premium', desc: 'Alto I+D y márgenes elevados' },
                      { id: 'conservador' as PersonalidadBot, label: 'Solidez Finan.', tag: 'Conservador', desc: 'Cero deuda y aversión al riesgo' },
                      { id: 'equilibrado' as PersonalidadBot, label: 'Equilibrio S.A.', tag: 'Adaptativo', desc: 'Responde a precios medios' }
                    ].map(b => {
                      const isChecked = botsSeleccionados.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBot(b.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isChecked
                              ? 'border-emerald-500/80 bg-emerald-500/10 text-white'
                              : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="font-semibold text-xs text-white">{b.label}</div>
                          <div className="text-[10px] text-emerald-400 font-medium mb-1">[{b.tag}]</div>
                          <div className="text-[10px] text-slate-400 leading-tight">{b.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle Modo Competitivo (Sin Ayudas) */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Swords className={`w-4 h-4 ${modoCompetitivo ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs text-white">Modo Competitivo Oficial (Sin Ayudas)</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      modoCompetitivo ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {modoCompetitivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Oculta la calculadora preventiva y las pistas. Entre rondas solo se publica el ranking, sin precios ni marketing de los demás, y el detalle completo se ve al final. Los alumnos deberán proyectar sus costos y flujo de caja manualmente.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={modoCompetitivo}
                    onChange={e => setModoCompetitivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Botón de Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creando}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {creando ? (
                    <span>Inicializando Motor de Mercado...</span>
                  ) : (
                    <>
                      <span>Iniciar Partida (Período 0)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel Lateral: Partidas Guardadas y Resumen Didáctico */}
        <div className="lg:col-span-5 space-y-6">
          {/* Unirse a una partida */}
          <form onSubmit={handleUnirse} className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-400" />
              ¿Te invitaron a una partida?
            </h3>
            <p className="text-xs text-slate-400">Ingresá el código que te compartieron. No necesitás crear una cuenta.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codigoUnirse}
                onChange={e => setCodigoUnirse(e.target.value.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="CÓDIGO"
                aria-label="Código de la partida"
                className="flex-1 min-w-0 px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-center text-base font-mono font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!codigoUnirse.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl disabled:opacity-40"
              >
                Unirme
              </button>
            </div>
          </form>

          {/* Tarjeta Didáctica para Alumnos */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Compass className="w-5 h-5" />
              <h3 className="font-bold text-sm tracking-wide uppercase">¿Cómo Funciona el Simulador?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Cada equipo gestiona una fábrica industrial a lo largo de rondas cuatrimestrales. Para ganar, deberán optimizar su rentabilidad tomando 10 decisiones estratégicas:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-medium">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-semibold block">Comercial:</span>
                Precio y Marketing para captar órdenes de compra.
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-semibold block">Producción:</span>
                Planta, nivel de uso (25-100%) y capacitación.
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-semibold block">Innovación:</span>
                I+D acumulativo para fidelizar clientes.
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-rose-400 font-semibold block">Finanzas:</span>
                Préstamos bancarios y control de caja estricto.
              </div>
            </div>
          </div>

          {/* Partidas Recientes */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Partidas Guardadas</span>
              <span className="text-xs text-slate-400 lowercase font-normal">{games.length} registradas</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Cargando partidas...</div>
            ) : games.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No hay partidas creadas aún. Creá la primera para comenzar el certamen.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {games.map(g => (
                  <div
                    key={g.id}
                    className="p-3.5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/game/${g.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                          {g.nombre}
                        </span>
                        {g.estado === 'finalizada' && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                            Finalizada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2.5 text-[11px] text-slate-400 mt-1 font-mono">
                        <span>P: <strong className="text-emerald-400">{g.periodoActual}/6</strong></span>
                        <span>•</span>
                        <span>{g.teams?.length || 0} equipos</span>
                        <span>•</span>
                        <span>{g.dispositivos === 'multiple' ? 'Online' : g.modo === 'certamen' ? 'Una computadora' : 'vs IA'}</span>
                        <span>•</span>
                        <span>{g.esCoordinador ? 'Coordinador' : 'Equipo'}</span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      {g.esCoordinador && (
                      <button
                        type="button"
                        onClick={(e) => handleEliminarPartida(e, g.id, g.nombre)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar esta partida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      )}
                      <Link
                        href={`/game/${g.id}`}
                        className="p-1.5 text-slate-500 group-hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
