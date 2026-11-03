import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const {
      teamId,
      periodo,
      precio,
      marketing,
      invDes,
      capacitacion,
      nivelProd,
      amplPlanta,
      pedPrestA,
      devPrestA,
      pedPrestB,
      devPrestB,
      razonamiento
    } = body;

    // Validaciones estrictas
    if (precio < 50 || precio > 100) {
      return NextResponse.json({ error: 'El precio debe estar entre 50 y 100' }, { status: 400 });
    }
    if (marketing < 0 || marketing > 10000) {
      return NextResponse.json({ error: 'El marketing debe estar entre 0 y 10000' }, { status: 400 });
    }
    if (capacitacion % 2000 !== 0 || capacitacion < 0 || capacitacion > 20000) {
      return NextResponse.json({ error: 'La capacitación debe ser múltiplo de 2000 entre 0 y 20000' }, { status: 400 });
    }
    if (![0, 25, 50, 75, 100].includes(nivelProd)) {
      return NextResponse.json({ error: 'El nivel de producción debe ser 0, 25, 50, 75 o 100' }, { status: 400 });
    }

    const decision = await prisma.roundDecision.upsert({
      where: {
        teamId_periodo: {
          teamId,
          periodo
        }
      },
      update: {
        precio,
        marketing,
        invDes,
        capacitacion,
        nivelProd,
        amplPlanta,
        pedPrestA,
        devPrestA,
        pedPrestB,
        devPrestB,
        razonamiento
      },
      create: {
        teamId,
        periodo,
        precio,
        marketing,
        invDes,
        capacitacion,
        nivelProd,
        amplPlanta,
        pedPrestA,
        devPrestA,
        pedPrestB,
        devPrestB,
        razonamiento
      }
    });

    return NextResponse.json(decision);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
