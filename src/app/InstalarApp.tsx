'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLAVE_DESCARTADO = 'simulando-instalacion-descartada';

// El navegador avisa una sola vez por carga y puede hacerlo antes de que se monte la pantalla,
// o mientras el usuario está en otra página: por eso se escucha fuera del componente.
let eventoPendiente: EventoInstalacion | null = null;
const suscriptores = new Set<() => void>();
const avisar = () => suscriptores.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault(); // Reemplaza el aviso automático del navegador por el botón de esta tarjeta.
    eventoPendiente = evento as EventoInstalacion;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoPendiente = null;
    avisar();
  });
}

function fueDescartado(): boolean {
  try {
    return localStorage.getItem(CLAVE_DESCARTADO) === '1';
  } catch {
    return false;
  }
}

function yaInstalada(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstalarApp() {
  const [modo, setModo] = useState<'oculto' | 'boton' | 'ios'>('oculto');

  useEffect(() => {
    const actualizar = () => {
      if (yaInstalada() || fueDescartado()) setModo('oculto');
      else if (eventoPendiente) setModo('boton');
      else setModo(esIOS() ? 'ios' : 'oculto');
    };
    actualizar();
    suscriptores.add(actualizar);
    return () => {
      suscriptores.delete(actualizar);
    };
  }, []);

  if (modo === 'oculto') return null;

  const instalar = async () => {
    if (!eventoPendiente) return;
    const evento = eventoPendiente;
    await evento.prompt();
    await evento.userChoice;
    eventoPendiente = null; // Cada aviso del navegador se puede usar una sola vez.
    avisar();
  };

  const descartar = () => {
    try {
      localStorage.setItem(CLAVE_DESCARTADO, '1');
    } catch {
      // Sin almacenamiento disponible, la tarjeta solo se oculta hasta recargar.
    }
    setModo('oculto');
  };

  return (
    <section data-testid="instalar-app" className="relative bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <button
        type="button"
        onClick={descartar}
        aria-label="No mostrar más"
        className="absolute top-2 right-2 p-2.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
      >
        <X className="w-4 h-4" />
      </button>

      <h3 className="font-bold text-sm text-white flex items-center gap-2 pr-8">
        <Download className="w-4 h-4 text-emerald-400" />
        Instalá la app en tu dispositivo
      </h3>

      {modo === 'boton' ? (
        <>
          <p className="text-xs text-slate-400">Abrila desde su ícono, en su propia ventana.</p>
          <button
            type="button"
            onClick={instalar}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Instalar app</span>
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tocá <Share className="inline w-3.5 h-3.5 mx-0.5 text-sky-400 align-text-bottom" aria-label="Compartir" /> <strong className="text-slate-200">Compartir</strong> y después <strong className="text-slate-200">Agregar a inicio</strong>.
          </p>
          <p className="text-xs text-amber-300">
            Hacelo antes de unirte a una partida: la app instalada puede no reconocer lo que hiciste en el navegador.
          </p>
        </>
      )}
    </section>
  );
}
