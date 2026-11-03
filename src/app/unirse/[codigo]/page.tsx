'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, LogIn, RefreshCw, TrendingUp } from 'lucide-react';

interface Invitacion {
  id: string;
  nombre: string;
  estado: string;
  periodoActual: number;
  modoCompetitivo: boolean;
  esCoordinador: boolean;
  miEquipo: string | null;
  equiposLibres: Array<{ id: string; nombre: string }>;
  puedeCrearEquipo: boolean;
}

export default function UnirsePage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [uniendo, setUniendo] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`/api/unirse/${encodeURIComponent(codigo)}`);
        const datos = await res.json();
        if (!res.ok) {
          setError(datos.error || 'No se pudo abrir la invitación');
          return;
        }
        if (datos.miEquipo) {
          router.replace(`/game/${datos.id}`);
          return;
        }
        setInvitacion(datos);
      } catch {
        setError('No se pudo conectar. Revisá tu conexión e intentá de nuevo.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [codigo, router]);

  const unirme = async (cuerpo: { nombre: string } | { teamId: string }) => {
    setUniendo(true);
    setError(null);
    try {
      const res = await fetch(`/api/unirse/${encodeURIComponent(codigo)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error || 'No se pudo unir a la partida');
        return;
      }
      router.push(`/game/${datos.gameId}`);
    } catch {
      setError('No se pudo conectar. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setUniendo(false);
    }
  };

  const sinLugar = invitacion && !invitacion.puedeCrearEquipo && invitacion.equiposLibres.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            SIMULANDO <span className="text-emerald-400">EMPRENDEDORES</span>
          </span>
        </div>

        {cargando && (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        )}

        {invitacion && (
          <>
            <div>
              <h1 className="text-xl font-bold text-white">¿Deseás unirte a la partida?</h1>
              <p className="text-base font-semibold text-emerald-400 mt-1 break-words">{invitacion.nombre}</p>
              <p className="text-xs text-slate-400 mt-1">
                {invitacion.modoCompetitivo ? 'Modo competitivo' : 'Modo práctica'} • Período {invitacion.periodoActual}
              </p>
            </div>

            {invitacion.puedeCrearEquipo && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  unirme({ nombre: nombreEquipo });
                }}
                className="space-y-3"
              >
                <label htmlFor="nombre-equipo" className="block text-xs font-semibold text-slate-300">
                  Nombre de tu equipo
                </label>
                <input
                  id="nombre-equipo"
                  type="text"
                  required
                  maxLength={80}
                  value={nombreEquipo}
                  onChange={e => setNombreEquipo(e.target.value)}
                  placeholder="Ej. Grupo 4 - Titanes"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-base text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={uniendo || !nombreEquipo.trim()}
                  className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{uniendo ? 'Uniéndome...' : 'Sí, unirme'}</span>
                </button>
              </form>
            )}

            {invitacion.equiposLibres.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  ¿Ya estabas en la partida? Retomá tu equipo:
                </p>
                {invitacion.equiposLibres.map(equipo => (
                  <button
                    key={equipo.id}
                    type="button"
                    disabled={uniendo}
                    onClick={() => unirme({ teamId: equipo.id })}
                    className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 text-left disabled:opacity-50"
                  >
                    {equipo.nombre}
                  </button>
                ))}
              </div>
            )}

            {sinLugar && (
              <p className="text-sm text-amber-300">
                {invitacion.estado === 'finalizada'
                  ? 'Esta partida ya terminó.'
                  : 'La partida ya empezó. Si sos parte de un equipo, pedile al coordinador que lo libere para retomarlo.'}
              </p>
            )}

            {invitacion.esCoordinador && (
              <Link href={`/game/${invitacion.id}`} className="block py-2 text-center text-xs text-slate-400 underline hover:text-white">
                Volver a la sala como coordinador
              </Link>
            )}
          </>
        )}

        {error && (
          <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!invitacion && !cargando && (
          <Link href="/" className="block py-2 text-center text-xs text-slate-400 underline hover:text-white">
            Volver al inicio
          </Link>
        )}
      </div>
    </div>
  );
}
