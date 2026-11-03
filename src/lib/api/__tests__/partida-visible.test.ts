import test from 'node:test';
import assert from 'node:assert/strict';
import { equipoEnTurno, partidaVisible } from '../partida-visible';

const decision = (teamId: string, periodo: number) => ({ id: `${teamId}-${periodo}`, teamId, periodo, precio: 77, marketing: 1234 }) as any;

const equipo = (id: string, esHumano: boolean, decisions: any[]) => ({
  id,
  gameId: 'g',
  nombre: id,
  esHumano,
  personalidad: null,
  planta: 60000,
  efectivo: 999,
  feedbackJson: '{"secreto":true}',
  decisions
}) as any;

const partida = (extra: object) => ({
  id: 'g',
  claveHash: 'hash-secreto',
  estado: 'en_curso',
  periodoActual: 1,
  modoCompetitivo: false,
  rounds: [{ periodo: 0, resultadoJson: '{}' }],
  teams: [
    equipo('a', true, [decision('a', 0), decision('a', 1)]),
    equipo('b', true, [decision('b', 0)]),
    equipo('bot', false, [decision('bot', 0)])
  ],
  ...extra
}) as any;

const buscar = (vista: any, id: string) => vista.teams.find((t: any) => t.id === id);

test('nunca expone la clave del navegador', () => {
  assert.equal('claveHash' in partidaVisible(partida({})), false);
});

test('el turno es del primer humano que no guardó', () => {
  assert.equal(equipoEnTurno(partida({}).teams, 1)?.id, 'b');
  assert.equal(equipoEnTurno(partida({}).teams, 0), null);
});

test('práctica: oculta la ronda en curso y muestra las ya simuladas', () => {
  const vista = partidaVisible(partida({}));
  const a = buscar(vista, 'a');
  assert.equal(a.yaGuardo, true);
  assert.deepEqual(a.decisions.map((d: any) => d.periodo), [0]);
  assert.equal(vista.rounds.length, 1);
});

test('competitivo: sin reportes ni decisiones, y solo se ve el estado del equipo en turno', () => {
  const vista = partidaVisible(partida({ modoCompetitivo: true }));
  assert.equal(vista.rounds.length, 0);

  const enTurno = buscar(vista, 'b');
  assert.equal(enTurno.efectivo, 999);
  assert.equal(enTurno.decisions.length, 0);
  assert.equal(enTurno.feedbackJson, null);

  for (const id of ['a', 'bot']) {
    const rival = buscar(vista, id);
    assert.equal(rival.efectivo, undefined);
    assert.equal(rival.planta, undefined);
    assert.equal(rival.decisions.length, 0);
  }
  assert.equal(buscar(vista, 'a').yaGuardo, true);
});

test('al finalizar se revela lo simulado, pero nunca lo cargado sin simular', () => {
  const vista = partidaVisible(partida({ modoCompetitivo: true, estado: 'finalizada' }));
  assert.equal(vista.rounds.length, 1);
  assert.equal(buscar(vista, 'b').efectivo, 999);
  assert.deepEqual(buscar(vista, 'a').decisions.map((d: any) => d.periodo), [0]);
});
