import { randomInt } from 'node:crypto';

// Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 6;

export function generarCodigoUnion(): string {
  return Array.from({ length: LARGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

export const normalizarCodigo = (codigo: string) => codigo.trim().toUpperCase();
