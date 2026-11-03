import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MINUTO, noEncontrada, ruta } from '@/lib/api/http';
import { filtroPartidaPropia } from '@/lib/api/clave-navegador';

export const POST = ruta<{ id: string }>({ bucket: 'escritura', max: 120, ventanaMs: MINUTO }, async (_req, { id }) => {
  const { count } = await prisma.game.updateMany({
    where: await filtroPartidaPropia(id),
    data: { estado: 'finalizada' }
  });
  if (count === 0) throw noEncontrada();
  return NextResponse.json({ success: true });
});
