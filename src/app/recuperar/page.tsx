'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, TrendingUp } from 'lucide-react';

export default function RecuperarPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo })
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error || 'No se pudo recuperar la partida');
        return;
      }
      router.push(`/game/${datos.gameId}`);
    } catch {
      setError('No se pudo conectar. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

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

        <div>
          <h1 className="text-xl font-bold text-white">Recuperar una partida como coordinador</h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingresá el código de coordinador que guardaste. La partida pasa a este navegador y el otro deja de coordinarla.
          </p>
        </div>

        <form onSubmit={recuperar} className="space-y-3">
          <label htmlFor="codigo-coordinador" className="block text-xs font-semibold text-slate-300">
            Código de coordinador
          </label>
          <input
            id="codigo-coordinador"
            type="text"
            required
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-base font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={enviando || !codigo.trim()}
            className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{enviando ? 'Recuperando...' : 'Recuperar partida'}</span>
          </button>
        </form>

        {error && (
          <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Link href="/" className="block py-2 text-center text-xs text-slate-400 underline hover:text-white">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
