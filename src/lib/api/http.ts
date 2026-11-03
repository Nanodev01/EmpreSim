import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const noEncontrada = () => new ApiError(404, 'Partida no encontrada');

export interface LimitePedidos {
  bucket: string;
  max: number;
  ventanaMs: number;
}

// Los límites son por IP y un aula completa suele compartir una: se fijan pensando en unos 40 dispositivos.
export const MINUTO = 60_000;
export const HORA = 60 * MINUTO;
const MAX_BYTES_CUERPO = 256 * 1024;
const MAX_CLAVES_LIMITE = 50_000;

const contadores = new Map<string, { cantidad: number; venceEn: number }>();

// El proxy agrega la IP real al final de X-Forwarded-For; los valores anteriores los controla el cliente.
function ipCliente(req: Request): string {
  const reenviada = req.headers.get('x-forwarded-for');
  return reenviada?.split(',').pop()?.trim() || 'directo';
}

function aplicarLimite(req: Request, limite: LimitePedidos) {
  const ahora = Date.now();
  if (contadores.size > MAX_CLAVES_LIMITE) {
    contadores.forEach((valor, clave) => {
      if (valor.venceEn <= ahora) contadores.delete(clave);
    });
  }

  const clave = `${limite.bucket}:${ipCliente(req)}`;
  const actual = contadores.get(clave);
  if (!actual || actual.venceEn <= ahora) {
    contadores.set(clave, { cantidad: 1, venceEn: ahora + limite.ventanaMs });
    return;
  }
  actual.cantidad += 1;
  if (actual.cantidad > limite.max) {
    throw new ApiError(429, 'Demasiados pedidos. Esperá un momento e intentá de nuevo.');
  }
}

export async function leerJson(req: Request): Promise<unknown> {
  const texto = await req.text();
  if (Buffer.byteLength(texto) > MAX_BYTES_CUERPO) {
    throw new ApiError(413, 'El contenido enviado es demasiado grande');
  }
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new ApiError(400, 'El contenido enviado no es JSON válido');
  }
}

type Manejador<P> = (req: Request, params: P) => Promise<Response>;

/** Envuelve una ruta con límite de pedidos y respuestas de error que no exponen detalles internos. */
export function ruta<P>(limite: LimitePedidos, manejador: Manejador<P>) {
  return async (req: Request, contexto: { params: Promise<P> }): Promise<Response> => {
    try {
      aplicarLimite(req, limite);
      return await manejador(req, await contexto.params);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        const mensaje = error.issues[0]?.message ?? 'Datos inválidos';
        return NextResponse.json({ error: mensaje }, { status: 400 });
      }
      if ((error as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'La operación entró en conflicto con otro cambio. Intentá de nuevo.' }, { status: 409 });
      }
      console.error(`Error no controlado en ${req.method} ${new URL(req.url).pathname}:`, error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  };
}
