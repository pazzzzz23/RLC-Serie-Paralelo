const COMPONENTS = ['resistencia', 'inductor', 'capacitor'];

function assertPositiveFinite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} debe ser un numero mayor que cero.`);
  }
}

function assertFinite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${field} debe ser un numero finito.`);
  }
}

function add(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

function multiply(a, b) {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function divide(a, b) {
  const scale = Math.max(Math.abs(b.re), Math.abs(b.im));
  if (scale === 0) throw new RangeError('No se puede dividir entre cero.');

  const denominatorRe = b.re / scale;
  const denominatorIm = b.im / scale;
  const denominator = denominatorRe ** 2 + denominatorIm ** 2;
  return {
    re: ((a.re / scale) * denominatorRe + (a.im / scale) * denominatorIm) / denominator,
    im: ((a.im / scale) * denominatorRe - (a.re / scale) * denominatorIm) / denominator
  };
}

function sum(values) {
  return values.reduce(add, { re: 0, im: 0 });
}

function assertComplexFinite(value, field) {
  if (!Number.isFinite(value.re) || !Number.isFinite(value.im)) {
    throw new RangeError(`El resultado de ${field} excede el rango numerico permitido.`);
  }
}

function cleanZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function formatNumber(value) {
  const rounded = cleanZero(Number(value.toPrecision(6)));
  return rounded.toLocaleString('es-ES', { maximumSignificantDigits: 6, useGrouping: false });
}

function formatComplex(value) {
  const sign = value.im < 0 ? '-' : '+';
  return `${formatNumber(value.re)} ${sign} j${formatNumber(Math.abs(value.im))}`;
}

function toPhasor(value) {
  const magnitude = Math.hypot(value.re, value.im);
  const angleDegrees = magnitude === 0
    ? 0
    : Math.atan2(value.im, value.re) * 180 / Math.PI;
  assertFinite(magnitude, 'magnitud fasorial');
  assertFinite(angleDegrees, 'angulo fasorial');

  return {
    real: cleanZero(value.re),
    imaginario: cleanZero(value.im),
    magnitud: magnitude,
    anguloGrados: cleanZero(angleDegrees),
    rectangular: formatComplex(value),
    polar: `${formatNumber(magnitude)} ∠ ${formatNumber(angleDegrees)}°`
  };
}

function calculate(input) {
  const { topologia, resistencia, inductancia, capacitancia, frecuencia, tension, angulo } = input;

  if (!['serie', 'paralelo'].includes(topologia)) {
    throw new TypeError('La topologia debe ser serie o paralelo.');
  }
  assertPositiveFinite(resistencia, 'La resistencia');
  assertPositiveFinite(inductancia, 'La inductancia');
  assertPositiveFinite(capacitancia, 'La capacitancia');
  assertPositiveFinite(frecuencia, 'La frecuencia');
  assertPositiveFinite(tension, 'La tension RMS');
  assertFinite(angulo, 'El angulo de tension');

  const omega = 2 * Math.PI * frecuencia;
  const reactanciaInductiva = omega * inductancia;
  const reactanciaCapacitiva = 1 / (omega * capacitancia);
  if (!Number.isFinite(reactanciaInductiva) || !Number.isFinite(reactanciaCapacitiva)) {
    throw new RangeError('Los valores ingresados producen una reactancia fuera del rango permitido.');
  }

  const impedances = {
    resistencia: { re: resistencia, im: 0 },
    inductor: { re: 0, im: reactanciaInductiva },
    capacitor: { re: 0, im: -reactanciaCapacitiva }
  };
  const voltageAngle = angulo * Math.PI / 180;
  const sourceVoltage = {
    re: tension * Math.cos(voltageAngle),
    im: tension * Math.sin(voltageAngle)
  };
  let sourceCurrent;
  let componentCurrents;
  let componentVoltages;
  let equivalentImpedance;

  if (topologia === 'serie') {
    equivalentImpedance = sum(Object.values(impedances));
    sourceCurrent = divide(sourceVoltage, equivalentImpedance);
    componentCurrents = Object.fromEntries(
      COMPONENTS.map(component => [component, sourceCurrent])
    );
    componentVoltages = Object.fromEntries(
      COMPONENTS.map(component => [component, multiply(sourceCurrent, impedances[component])])
    );
  } else {
    componentCurrents = Object.fromEntries(
      COMPONENTS.map(component => [component, divide(sourceVoltage, impedances[component])])
    );
    sourceCurrent = sum(Object.values(componentCurrents));
    equivalentImpedance = divide(sourceVoltage, sourceCurrent);
    componentVoltages = Object.fromEntries(
      COMPONENTS.map(component => [component, sourceVoltage])
    );
  }

  assertComplexFinite(sourceCurrent, 'la corriente total');
  assertComplexFinite(equivalentImpedance, 'la impedancia equivalente');
  for (const component of COMPONENTS) {
    assertComplexFinite(componentCurrents[component], `la corriente del ${component}`);
    assertComplexFinite(componentVoltages[component], `la tension del ${component}`);
  }

  return {
    frecuenciaAngular: omega,
    reactanciaInductiva,
    reactanciaCapacitiva,
    impedanciaEquivalente: toPhasor(equivalentImpedance),
    tensionFuente: toPhasor(sourceVoltage),
    corrienteTotal: toPhasor(sourceCurrent),
    componentes: Object.fromEntries(COMPONENTS.map(component => [
      component,
      {
        corriente: toPhasor(componentCurrents[component]),
        tension: toPhasor(componentVoltages[component])
      }
    ]))
  };
}

module.exports = { calculate };
