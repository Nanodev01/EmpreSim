import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCasoPorId } from '@/lib/engine/cases';
import { PersonalidadBot } from '@/lib/engine/bots';

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        teams: true,
        rounds: {
          orderBy: { periodo: 'desc' },
          take: 1
        }
      }
    });
    return NextResponse.json(games);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, modo, casoId, nombreEmpresa, personalidadesBots, equiposAlumnos, modoCompetitivo } = body;

    const caso = getCasoPorId(casoId || 'clasico-alta');
    const configCasoJson = JSON.stringify(caso);

    // Determinar los equipos humanos
    let humanTeamsToCreate: Array<{ nombre: string }> = [];

    if (Array.isArray(equiposAlumnos) && equiposAlumnos.length > 0) {
      humanTeamsToCreate = equiposAlumnos.map((eq: any) => ({
        nombre: typeof eq === 'string' ? eq.trim() : (eq.nombre ? eq.nombre.trim() : 'Equipo')
      })).filter(eq => eq.nombre.length > 0);
    } else if (modo === 'certamen') {
      humanTeamsToCreate = [
        { nombre: 'Equipo Alfa' },
        { nombre: 'Equipo Beta' },
        { nombre: 'Equipo Gamma' }
      ];
    } else {
      humanTeamsToCreate = [
        { nombre: nombreEmpresa?.trim() || 'Mi Empresa S.A.' }
      ];
    }

    // Determinar los bots
    const botsToCreate = (Array.isArray(personalidadesBots) ? personalidadesBots : (modo === 'vs-ai' ? ['agresivo', 'premium', 'conservador'] : [])).map((perso: PersonalidadBot, i: number) => {
      const nombresDefault: Record<PersonalidadBot, string> = {
        agresivo: 'Dumping Corp (IA)',
        premium: 'Luxe Innovations (IA)',
        conservador: 'Solidez Financiera (IA)',
        equilibrado: 'Equilibrio S.A. (IA)'
      };
      return {
        nombre: nombresDefault[perso] || `Bot IA ${i + 1}`,
        esHumano: false,
        personalidad: perso,
        planta: 50000,
        capital: 70000,
        efectivo: 0,
        stockUnidades: 0,
        stockValorizado: 0,
        capacitacionAcum: 0,
        idAcumulado: 0,
        empleados: 0,
        prestamosBcoA: 0,
        prestamosBcoB: 0,
        utilidadAcumulada: 0
      };
    });

    const teamsData = [
      ...humanTeamsToCreate.map(h => ({
        nombre: h.nombre,
        esHumano: true,
        planta: 50000,
        capital: 70000,
        efectivo: 0,
        stockUnidades: 0,
        stockValorizado: 0,
        capacitacionAcum: 0,
        idAcumulado: 0,
        empleados: 0,
        prestamosBcoA: 0,
        prestamosBcoB: 0,
        utilidadAcumulada: 0
      })),
      ...botsToCreate
    ];

    const game = await prisma.game.create({
      data: {
        nombre: nombre || `Partida ${new Date().toLocaleDateString('es-AR')}`,
        modo: modo || 'vs-ai',
        casoId: caso.id,
        periodoActual: 0,
        estado: 'en_curso',
        configCasoJson,
        modoCompetitivo: Boolean(modoCompetitivo),
        teams: {
          create: teamsData
        }
      },
      include: {
        teams: true
      }
    });

    return NextResponse.json(game);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
