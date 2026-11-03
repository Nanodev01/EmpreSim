import { randomInt } from 'node:crypto';

// Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 6;

export function generarCodigoUnion(): string {
  return Array.from({ length: LARGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

export const normalizarCodigo = (codigo: string) => codigo.trim().toUpperCase();

// El código de coordinador da control total de la partida: es largo (unos 79 bits) para que no se pueda adivinar.
const LARGO_COORDINADOR = 16;

export function generarCodigoCoordinador(): string {
  return Array.from({ length: LARGO_COORDINADOR }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

/** Acepta el código como se haya copiado: con guiones, espacios o en minúsculas. */
export const normalizarCodigoCoordinador = (codigo: string) => codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
