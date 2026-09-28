import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProtocolJson } from './parser';

const protocoloValido = {
  initial: { temperature: 95, duration_seconds: 180 },
  cycles: {
    count: 35,
    steps: [
      { type: 'denaturation', temperature: 95, duration_seconds: 30 },
      { type: 'annealing', temperature: 60, duration_seconds: 30 },
      { type: 'extension', temperature: 72, duration_seconds: 45 },
    ],
  },
  final_extension: { temperature: 72, duration_seconds: 300 },
  hold: { temperature: 4 },
};

test('parsea correctamente el ejemplo literal de la sección 5 de la spec', () => {
  const result = parseProtocolJson(protocoloValido, 'p1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.protocol.cycles.count, 35);
    assert.equal(result.protocol.cycles.steps.length, 3);
    assert.equal(result.protocol.initial?.temperature, 95);
    assert.equal(result.protocol.finalExtension?.durationSeconds, 300);
    assert.equal(result.protocol.hold?.temperature, 4);
  }
});

test('un protocolo sin initial ni hold también es válido (son opcionales)', () => {
  const minimo = {
    cycles: {
      count: 30,
      steps: [{ type: 'denaturation', temperature: 95, duration_seconds: 20 }],
    },
  };
  const result = parseProtocolJson(minimo, 'p2');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.protocol.initial, undefined);
    assert.equal(result.protocol.hold, undefined);
  }
});

test('rechaza un protocolo sin cycles', () => {
  const result = parseProtocolJson({ initial: { temperature: 95, duration_seconds: 180 } }, 'p3');
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some(e => e.path === 'cycles'));
});

test('rechaza un paso sin temperature', () => {
  const roto = {
    cycles: { count: 10, steps: [{ type: 'annealing', duration_seconds: 30 }] },
  };
  const result = parseProtocolJson(roto, 'p4');
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some(e => e.path === 'cycles.steps[0].temperature'));
});

test('un tipo de paso desconocido no es un error: se guarda como custom con su nombre original', () => {
  const conPasoRaro = {
    cycles: {
      count: 5,
      steps: [{ type: 'activacion_enzimatica', temperature: 50, duration_seconds: 600 }],
    },
  };
  const result = parseProtocolJson(conPasoRaro, 'p5');
  assert.equal(result.ok, true);
  if (result.ok) {
    const step = result.protocol.cycles.steps[0];
    assert.equal(step.type, 'custom');
    assert.equal(step.label, 'activacion_enzimatica');
  }
});

test('rechaza un valor que no es un objeto', () => {
  const result = parseProtocolJson('esto no es un protocolo', 'p6');
  assert.equal(result.ok, false);
});
