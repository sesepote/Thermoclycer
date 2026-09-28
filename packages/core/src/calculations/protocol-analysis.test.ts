import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotalRuntime, validateProtocol } from './protocol-analysis';
import { Protocol } from '../knowledge/entities/protocol';

function demoProtocol(): Protocol {
  return {
    id: 'p1',
    initial: { temperature: 95, durationSeconds: 180 },
    cycles: {
      count: 35,
      steps: [
        { type: 'denaturation', temperature: 95, durationSeconds: 30 },
        { type: 'annealing', temperature: 60, durationSeconds: 30 },
        { type: 'extension', temperature: 72, durationSeconds: 45 },
      ],
    },
    finalExtension: { temperature: 72, durationSeconds: 300 },
    hold: { temperature: 4 },
  };
}

test('validateProtocol: el protocolo de ejemplo de la spec es válido', () => {
  const result = validateProtocol(demoProtocol());
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test('validateProtocol: detecta una duración negativa', () => {
  const protocol = demoProtocol();
  protocol.cycles.steps[0].durationSeconds = -5;
  const result = validateProtocol(protocol);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(i => i.code === 'INVALID_VALUE'));
});

test('validateProtocol: detecta cero ciclos', () => {
  const protocol = demoProtocol();
  protocol.cycles.count = 0;
  const result = validateProtocol(protocol);
  assert.ok(result.issues.some(i => i.code === 'CYCLE_COUNT_TOO_LOW'));
});

test('validateProtocol: detecta que faltan pasos dentro del ciclo', () => {
  const protocol = demoProtocol();
  protocol.cycles.steps = [];
  const result = validateProtocol(protocol);
  assert.ok(result.issues.some(i => i.code === 'MISSING_STEP'));
});

test('validateProtocol: detecta una temperatura físicamente imposible', () => {
  const protocol = demoProtocol();
  protocol.cycles.steps[1].temperature = 300;
  const result = validateProtocol(protocol);
  assert.ok(result.issues.some(i => i.code === 'INVALID_VALUE'));
});

test('calculateTotalRuntime: suma inicial + ciclos + extensión final (sin contar el hold)', () => {
  // 180 + 35*(30+30+45) + 300 = 180 + 3675 + 300 = 4155
  const result = calculateTotalRuntime(demoProtocol());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.value, 4155);
});

test('calculateTotalRuntime: un protocolo inválido no da una duración inventada', () => {
  const protocol = demoProtocol();
  protocol.cycles.count = -1;
  const result = calculateTotalRuntime(protocol);
  assert.equal(result.ok, false);
});
