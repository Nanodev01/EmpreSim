'use client';

import { useEffect } from 'react';

export default function RegistroServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    // Sin service worker la app sigue funcionando: solo se pierde la pantalla sin conexión.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
