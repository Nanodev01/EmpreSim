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
  rounds: [{
    periodo: 0,
    resultadoJson: JSON.stringify({
      periodo: 0,
      total_mercado_unidades: 100,
      precio_promedio: 80,
      resultados_equipos: { a: { secreto: true } },
      ranking: [{ posicion: 1, equipo_id: 'a', nombre: 'a', precio: 77, marketing: 1234, efectivo: 5, ventas_unidades: 50, cuota_mercado_pct: 50, utilidad_periodo: 9, utilidad_acumulada: 9 }]
    })
  }],
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

test('competitivo: el ranking se publica sin los valores que cargó cada equipo', () => {
  const vista = partidaVisible(partida({ modoCompetitivo: true }));
  const ronda = JSON.parse(vista.rounds[0].resultadoJson);
  assert.equal(ronda.ranking[0].posicion, 1);
  assert.equal(ronda.ranking[0].utilidad_acumulada, 9);
  assert.equal(ronda.ranking[0].ventas_unidades, 50);
  for (const campo of ['precio', 'marketing', 'efectivo']) {
    assert.equal(campo in ronda.ranking[0], false, campo);
  }
  assert.equal('precio_promedio' in ronda, false);
  assert.deepEqual(ronda.resultados_equipos, {});
});

test('competitivo: sin decisiones, y solo se ve el estado del equipo en turno', () => {
  const vista = partidaVisible(partida({ modoCompetitivo: true }));

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
  assert.equal(JSON.parse(vista.rounds[0].resultadoJson).ranking[0].precio, 77);
  assert.equal(buscar(vista, 'b').efectivo, 999);
  assert.deepEqual(buscar(vista, 'a').decisions.map((d: any) => d.periodo), [0]);
});
