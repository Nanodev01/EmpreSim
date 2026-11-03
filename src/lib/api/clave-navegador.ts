import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { noEncontrada } from './http';

const COOKIE = 'se_clave_navegador';
const UN_ANIO_SEGUNDOS = 60 * 60 * 24 * 365;

const hashear = (clave: string) => createHash('sha256').update(clave).digest('hex');

/**
 * Sin cuentas de usuario: cada navegador recibe una clave anónima que lo identifica como
 * dueño de las partidas que crea. En la base solo se guarda su hash.
 */
export async function hashClaveActual(): Promise<string | null> {
  const clave = (await cookies()).get(COOKIE)?.value;
  return clave ? hashear(clave) : null;
}

export async function obtenerOCrearHashClave(req: Request): Promise<string> {
  const existente = await hashClaveActual();
  if (existente) return existente;

  const clave = randomBytes(32).toString('base64url');
  (await cookies()).set(COOKIE, clave, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: UN_ANIO_SEGUNDOS
  });
  return hashear(clave);
}

/** Filtro para las acciones del coordinador: solo el navegador que creó la partida. */
export async function filtroPartidaPropia(id: string) {
  const claveHash = await hashClaveActual();
  if (!claveHash) throw noEncontrada();
  return { id, claveHash };
}

/** Filtro para quien participa en la partida: el coordinador o un navegador asociado a un equipo. */
export async function accesoParticipante(id: string) {
  const claveHash = await hashClaveActual();
  if (!claveHash) throw noEncontrada();
  return {
    claveHash,
    where: { id, OR: [{ claveHash }, { teams: { some: { claveHash } } }] }
  };
}
