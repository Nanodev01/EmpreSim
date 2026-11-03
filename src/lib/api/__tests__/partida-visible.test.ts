import test from 'node:test';
import assert from 'node:assert/strict';
import { equipoEnTurno, partidaVisible as vistaDe, visorDe } from '../partida-visible';

const COORDINADOR = { esCoordinador: true, miEquipoId: null };
const partidaVisible = (p: any, visor: any = COORDINADOR) => vistaDe(p, visor);

const decision = (teamId: string, periodo: number) => ({ id: `${teamId}-${periodo}`, teamId, periodo, precio: 77, marketing: 1234 }) as any;

const equipo = (id: string, esHumano: boolean, decisions: any[]) => ({
  id,
  claveHash: `clave-${id}`,
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

test('nunca expone la clave de un equipo', () => {
  const vista = partidaVisible(partida({ dispositivos: 'multiple' }));
  assert.equal(JSON.stringify(vista).includes('clave-a'), false);
  assert.equal(buscar(vista, 'a').conectado, true);
});

test('reconoce al coordinador y al equipo de cada navegador', () => {
  const p = partida({});
  assert.deepEqual(visorDe(p, 'hash-secreto'), { esCoordinador: true, miEquipoId: null });
  assert.deepEqual(visorDe(p, 'clave-b'), { esCoordinador: false, miEquipoId: 'b' });
  assert.deepEqual(visorDe(p, null), { esCoordinador: false, miEquipoId: null });
});

test('online: cada equipo ve lo suyo, incluso la ronda en curso, y nada de los rivales', () => {
  const p = partida({ dispositivos: 'multiple', modoCompetitivo: true });
  const vista = partidaVisible(p, { esCoordinador: false, miEquipoId: 'a' });

  const propio = buscar(vista, 'a');
  assert.equal(propio.efectivo, 999);
  assert.deepEqual(propio.decisions.map((d: any) => d.periodo).sort(), [0, 1]);

  const rival = buscar(vista, 'b');
  assert.equal(rival.efectivo, undefined);
  assert.equal(rival.decisions.length, 0);

  const ronda = JSON.parse(vista.rounds[0].resultadoJson);
  assert.deepEqual(Object.keys(ronda.resultados_equipos), ['a']);
  assert.equal('precio' in ronda.ranking[0], false);
});

test('online: el rival nunca ve la carga en curso de otro, ni en práctica', () => {
  const p = partida({ dispositivos: 'multiple' });
  const vista = partidaVisible(p, { esCoordinador: false, miEquipoId: 'b' });
  assert.deepEqual(buscar(vista, 'a').decisions.map((d: any) => d.periodo), [0]);
  assert.equal(buscar(vista, 'a').feedbackJson, null);
});

test('online competitivo: el coordinador tampoco ve los valores hasta el final', () => {
  const vista = partidaVisible(partida({ dispositivos: 'multiple', modoCompetitivo: true }), COORDINADOR);
  assert.equal(buscar(vista, 'a').efectivo, undefined);
  assert.equal(buscar(vista, 'a').decisions.length, 0);
  assert.deepEqual(JSON.parse(vista.rounds[0].resultadoJson).resultados_equipos, {});
});

test('el código de coordinador solo llega a quien coordina', () => {
  const p = partida({ dispositivos: 'multiple', codigoCoordinador: 'SECRETO123' });
  assert.equal(partidaVisible(p, COORDINADOR).codigoCoordinador, 'SECRETO123');

  const deEquipo = partidaVisible(p, { esCoordinador: false, miEquipoId: 'a' });
  assert.equal('codigoCoordinador' in deEquipo, false);
  assert.equal(JSON.stringify(deEquipo).includes('SECRETO123'), false);
});
