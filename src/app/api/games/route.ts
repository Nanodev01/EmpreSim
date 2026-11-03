import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCasoPorId } from '@/lib/engine/cases';
import { PersonalidadBot } from '@/lib/engine/bots';
import { ApiError, HORA, MINUTO, leerJson, ruta } from '@/lib/api/http';
import { hashClaveActual, obtenerOCrearHashClave } from '@/lib/api/clave-navegador';
import { generarCodigoCoordinador, generarCodigoUnion } from '@/lib/api/codigo-union';
import { esquemaNuevaPartida } from '@/lib/api/esquemas';

const NOMBRES_BOTS: Record<PersonalidadBot, string> = {
  agresivo: 'Dumping Corp (IA)',
  premium: 'Luxe Innovations (IA)',
  conservador: 'Solidez Financiera (IA)',
  equilibrado: 'Equilibrio S.A. (IA)'
};

export const GET = ruta<object>({ bucket: 'lectura', max: 1500, ventanaMs: MINUTO }, async () => {
  const claveHash = await hashClaveActual();
  if (!claveHash) return NextResponse.json([]);

  const partidas = await prisma.game.findMany({
    where: { OR: [{ claveHash }, { teams: { some: { claveHash } } }] },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      nombre: true,
      modo: true,
      estado: true,
      periodoActual: true,
      modoCompetitivo: true,
      dispositivos: true,
      updatedAt: true,
      claveHash: true,
      teams: { select: { id: true } }
    }
  });

  return NextResponse.json(partidas.map(({ claveHash: dueno, ...partida }) => ({
    ...partida,
    esCoordinador: dueno === claveHash
  })));
});

export const POST = ruta<object>({ bucket: 'crear', max: 30, ventanaMs: HORA }, async (req) => {
  const datos = esquemaNuevaPartida.parse(await leerJson(req));
  const caso = getCasoPorId(datos.casoId ?? 'clasico-alta');

  // La práctica contra bots es de un solo equipo: no hay a quién invitar.
  const online = datos.dispositivos === 'multiple' && datos.modo === 'certamen';

  const alumnos = (datos.equiposAlumnos ?? []).filter(nombre => nombre.length > 0);
  let nombresHumanos: string[];
  if (online) {
    nombresHumanos = []; // Cada equipo se suma con su propio nombre desde su dispositivo.
  } else if (alumnos.length > 0) {
    nombresHumanos = alumnos;
  } else if (datos.modo === 'certamen') {
    nombresHumanos = ['Equipo Alfa', 'Equipo Beta', 'Equipo Gamma'];
  } else {
    nombresHumanos = [datos.nombreEmpresa || 'Mi Empresa S.A.'];
  }

  const personalidades: PersonalidadBot[] = datos.personalidadesBots
    ?? (datos.modo === 'vs-ai' ? ['agresivo', 'premium', 'conservador'] : []);

  const claveHash = await obtenerOCrearHashClave(req);

  for (let intento = 0; intento < 5; intento += 1) {
    try {
      const partida = await prisma.game.create({
        data: {
          nombre: datos.nombre || `Partida ${new Date().toLocaleDateString('es-AR')}`,
          modo: datos.modo,
          casoId: caso.id,
          estado: 'en_curso',
          configCasoJson: JSON.stringify(caso),
          modoCompetitivo: Boolean(datos.modoCompetitivo),
          dispositivos: online ? 'multiple' : 'unico',
          codigo: online ? generarCodigoUnion() : null,
          codigoCoordinador: generarCodigoCoordinador(),
          claveHash,
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
        select: { id: true, codigo: true }
      });
      return NextResponse.json(partida);
    } catch (error) {
      // Choque de código con otra partida: se reintenta con otro.
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
  throw new ApiError(503, 'No se pudo generar un código de partida. Intentá de nuevo.');
});
