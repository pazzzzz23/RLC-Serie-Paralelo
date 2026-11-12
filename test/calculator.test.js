const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../src/calculator');

const baseInput = {
  topologia: 'serie',
  resistencia: 100,
  inductancia: 0.1,
  capacitancia: 0.0001,
  frecuencia: 50,
  tension: 120,
  angulo: 0
};

test('serie: corriente de fuente igual en todos los elementos y se cumple KVL', () => {
  const result = calculate(baseInput);
  const current = result.corrienteTotal;
  assert.equal(result.componentes.resistencia.corriente.real, current.real);
  assert.equal(result.componentes.inductor.corriente.imaginario, current.imaginario);

  const voltages = Object.values(result.componentes).map(item => item.tension);
  const sumReal = voltages.reduce((total, item) => total + item.real, 0);
  const sumImaginary = voltages.reduce((total, item) => total + item.imaginario, 0);
  assert.ok(Math.abs(sumReal - result.tensionFuente.real) < 1e-10);
  assert.ok(Math.abs(sumImaginary - result.tensionFuente.imaginario) < 1e-10);
});

test('paralelo: la tension de cada rama es la tension de fuente y se cumple KCL', () => {
  const result = calculate({ ...baseInput, topologia: 'paralelo', angulo: 30 });
  const branchVoltages = Object.values(result.componentes).map(item => item.tension);
  for (const voltage of branchVoltages) {
    assert.equal(voltage.real, result.tensionFuente.real);
    assert.equal(voltage.imaginario, result.tensionFuente.imaginario);
  }
  const currents = Object.values(result.componentes).map(item => item.corriente);
  assert.ok(Math.abs(currents.reduce((sum, item) => sum + item.real, 0) - result.corrienteTotal.real) < 1e-12);
  assert.ok(Math.abs(currents.reduce((sum, item) => sum + item.imaginario, 0) - result.corrienteTotal.imaginario) < 1e-12);
});

test('entrega fasores rectangulares y polares para fuente y cada elemento', () => {
  const result = calculate(baseInput);
  for (const phasor of [
    result.corrienteTotal,
    result.tensionFuente,
    ...Object.values(result.componentes).flatMap(item => [item.corriente, item.tension])
  ]) {
    assert.match(phasor.rectangular, /j/);
    assert.match(phasor.polar, /∠/);
    assert.ok(Number.isFinite(phasor.magnitud));
    assert.ok(Number.isFinite(phasor.anguloGrados));
  }
});

test('rechaza topologia desconocida y parametros no positivos', () => {
  assert.throws(() => calculate({ ...baseInput, topologia: 'mixto' }), /topologia/);
  assert.throws(() => calculate({ ...baseInput, frecuencia: 0 }), /frecuencia/);
  assert.throws(() => calculate({ ...baseInput, resistencia: -1 }), /resistencia/);
});
