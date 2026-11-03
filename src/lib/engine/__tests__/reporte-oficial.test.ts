/**
 * Compara el motor con los valores publicados en Docs/EJ-COMERCIAL.txt (Período 0).
 * El efectivo se valida contra el reporte y no contra el balance, que cuadra por construcción.
 *
 * El motor usa Docs/Planilla-de-Costos.xls (costo 71,75), mientras que el reporte sale del
 * ejecutable, que trabaja con más decimales (53807 / 750 = 71,7427). Por eso los importes que
 * dependen del costo pueden diferir hasta TOLERANCIA_COSTO dólares en este caso.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SimuladorEmpresarial } from '../simulator';

const TOLERANCIA_COSTO = 5;

function casi(actual: number, esperado: number) {
  assert.ok(Math.abs(actual - esperado) <= TOLERANCIA_COSTO, `${actual} difiere de ${esperado}`);
}

const resultado = SimuladorEmpresarial.simularPeriodoEquipo(
  {
    planta: 50000,
    capital: 70000,
    efectivo: 0,
    stock_unidades: 0,
    stock_valorizado: 0,
    utilidad_acumulada: 0,
    empleados: 0,
    periodo: 0
  },
  {
    precio: 89,
    marketing: 7000,
    inv_des: 1000,
    capacitacion: 4000,
    nivel_prod: 75,
    ampl_planta: 10000,
    ped_prest_a: 50000,
    ped_prest_b: 50000,
    dev_prest_a: 0,
    dev_prest_b: 0
  },
  1085
);

test('estado de resultados coincide con el reporte oficial', () => {
  const er = resultado.estado_resultados;
  assert.equal(er.ventas, 66750);
  casi(er.costo_merc_vend, 53807);
  assert.equal(er.subsidios, 3700);
  assert.equal(er.mantenimiento, 4000);
  assert.equal(er.intereses, 8000);
  casi(resultado.balance.util_acumulada, -7358);
});

test('balance coincide con el reporte oficial', () => {
  casi(resultado.balance.efectivo, 102642);
  assert.equal(resultado.balance.stock_valorizado, 0);
  casi(resultado.balance.total_activo, 162642);
});

test('producción y comercial coinciden con el reporte oficial', () => {
  assert.equal(resultado.reporte_produccion.produccion_unid, 750);
  assert.equal(resultado.reporte_produccion.empleados, 37);
  assert.equal(resultado.reporte_produccion.costo_unitario, 71.75);
  assert.equal(resultado.reporte_comercial.ventas_realizadas, 750);
  assert.equal(resultado.reporte_comercial.ordenes_no_realizadas, 335);
});

test('delphiRound aplica redondeo bancario en los empates', () => {
  for (const [entrada, esperado] of [[0.5, 0], [1.5, 2], [2.5, 2], [912.5, 912], [-2.5, -2], [-3.5, -4], [2.4, 2], [2.6, 3]]) {
    assert.equal(SimuladorEmpresarial.delphiRound(entrada) + 0, esperado, `entrada ${entrada}`);
  }
});
