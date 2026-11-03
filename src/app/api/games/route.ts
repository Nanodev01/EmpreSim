import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCasoPorId } from '@/lib/engine/cases';
import { PersonalidadBot } from '@/lib/engine/bots';
import { HORA, MINUTO, leerJson, ruta } from '@/lib/api/http';
import { hashClaveActual, obtenerOCrearHashClave } from '@/lib/api/clave-navegador';
import { esquemaNuevaPartida } from '@/lib/api/esquemas';
import { partidaVisible } from '@/lib/api/partida-visible';

const NOMBRES_BOTS: Record<PersonalidadBot, string> = {
  agresivo: 'Dumping Corp (IA)',
  premium: 'Luxe Innovations (IA)',
  conservador: 'Solidez Financiera (IA)',
  equilibrado: 'Equilibrio S.A. (IA)'
};

export const GET = ruta<object>({ bucket: 'lectura', max: 300, ventanaMs: MINUTO }, async () => {
  const claveHash = await hashClaveActual();
  if (!claveHash) return NextResponse.json([]);

  const partidas = await prisma.game.findMany({
    where: { claveHash },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      nombre: true,
      modo: true,
      estado: true,
      periodoActual: true,
      modoCompetitivo: true,
      updatedAt: true,
      teams: { select: { id: true } }
    }
  });
  return NextResponse.json(partidas);
});

export const POST = ruta<object>({ bucket: 'crear', max: 30, ventanaMs: HORA }, async (req) => {
  const datos = esquemaNuevaPartida.parse(await leerJson(req));
  const caso = getCasoPorId(datos.casoId ?? 'clasico-alta');

  const alumnos = (datos.equiposAlumnos ?? []).filter(nombre => nombre.length > 0);
  let nombresHumanos: string[];
  if (alumnos.length > 0) {
    nombresHumanos = alumnos;
  } else if (datos.modo === 'certamen') {
    nombresHumanos = ['Equipo Alfa', 'Equipo Beta', 'Equipo Gamma'];
  } else {
    nombresHumanos = [datos.nombreEmpresa || 'Mi Empresa S.A.'];
  }

  const personalidades: PersonalidadBot[] = datos.personalidadesBots
    ?? (datos.modo === 'vs-ai' ? ['agresivo', 'premium', 'conservador'] : []);

  const partida = await prisma.game.create({
    data: {
      nombre: datos.nombre || `Partida ${new Date().toLocaleDateString('es-AR')}`,
      modo: datos.modo,
      casoId: caso.id,
      estado: 'en_curso',
      configCasoJson: JSON.stringify(caso),
      modoCompetitivo: Boolean(datos.modoCompetitivo),
      claveHash: await obtenerOCrearHashClave(req),
      teams: {
        create: [
          ...nombresHumanos.map(nombre => ({ nombre, esHumano: true })),
          ...personalidades.map(personalidad => ({
            nombre: NOMBRES_BOTS[personalidad],
            esHumano: false,
            personalidad
          }))
        ]
      }
    },
    include: { teams: { include: { decisions: true } }, rounds: true }
  });

  return NextResponse.json(partidaVisible(partida));
});
