import test from 'node:test';
import assert from 'node:assert/strict';
import { esquemaCaso, esquemaDecision, esquemaNuevaPartida } from '../esquemas';
import { CASOS_PREDEFINIDOS } from '@/lib/engine/cases';

const valida = {
  teamId: 'equipo',
  periodo: 0,
  precio: 89,
  marketing: 7000,
  invDes: 1000,
  capacitacion: 4000,
  nivelProd: 75,
  amplPlanta: 10000,
  pedPrestA: 50000,
  devPrestA: 0,
  pedPrestB: 50000,
  devPrestB: 0
};

test('acepta el cupón del ejemplo oficial', () => {
  assert.equal(esquemaDecision.safeParse(valida).success, true);
});

const invalidos: Array<[string, object]> = [
  ['monto negativo', { amplPlanta: -5000 }],
  ['ampliación que no es múltiplo', { amplPlanta: 1234 }],
  ['I+D negativo', { invDes: -1 }],
  ['préstamo negativo', { pedPrestA: -99999999 }],
  ['precio fuera de rango', { precio: 101 }],
  ['precio con decimales', { precio: 89.5 }],
  ['capacitación que no es múltiplo', { capacitacion: 2500 }],
  ['nivel inexistente', { nivelProd: 30 }],
  ['campo vacío', { marketing: '' }],
  ['campo faltante', { precio: undefined }],
  ['campo desconocido', { efectivo: 1000000 }]
];

for (const [nombre, cambio] of invalidos) {
  test(`rechaza ${nombre}`, () => {
    assert.equal(esquemaDecision.safeParse({ ...valida, ...cambio }).success, false);
  });
}

test('todos los casos predefinidos cumplen el esquema', () => {
  for (const caso of CASOS_PREDEFINIDOS) {
    assert.equal(esquemaCaso.safeParse(caso).success, true, caso.id);
  }
});

test('rechaza un caso vacío, que dejaría la partida sin poder simular', () => {
  assert.equal(esquemaCaso.safeParse({}).success, false);
});

test('rechaza personalidades de bot desconocidas', () => {
  assert.equal(esquemaNuevaPartida.safeParse({ personalidadesBots: ['hacker'] }).success, false);
});
