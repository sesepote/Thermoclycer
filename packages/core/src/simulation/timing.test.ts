import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTiming } from './timing';
import { Protocol } from '../knowledge/entities/protocol';

function protocolo(): Protocol {
  return {
    id: 'p1',
    initial: { temperature: 95, durationSeconds: 180 },
    cycles: {
      count: 2,
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

// duración total: 180 + 2*(30+30+45) + 300 = 180 + 210 + 300 = 690

test('en t=0 está en la fase inicial', () => {
  const timing = resolveTiming(protocolo(), 0, 690);
  assert.equal(timing.phase, 'initial');
  assert.equal(timing.targetTemperature, 95);
  assert.equal(timing.remainingInPhaseSeconds, 180);
});

test('justo tras la fase inicial entra en el primer paso del primer ciclo', () => {
  const timing = resolveTiming(protocolo(), 180, 690);
  assert.equal(timing.phase, 'cycle');
  assert.equal(timing.cycleNumber, 1);
  assert.equal(timing.stepIndex, 0);
  assert.equal(timing.targetTemperature, 95);
});

test('a mitad del segundo ciclo está en el paso de annealing', () => {
  // 180 (initial) + 105 (ciclo 1 completo) + 30 (denat ciclo 2) + 15 (mitad de annealing) = 330
  const timing = resolveTiming(protocolo(), 330, 690);
  assert.equal(timing.phase, 'cycle');
  assert.equal(timing.cycleNumber, 2);
  assert.equal(timing.stepIndex, 1);
  assert.equal(timing.targetTemperature, 60);
  assert.equal(timing.remainingInPhaseSeconds, 15);
});

test('tras acabar los ciclos entra en la extensión final', () => {
  const timing = resolveTiming(protocolo(), 180 + 210 + 10, 690);
  assert.equal(timing.phase, 'final_extension');
  assert.equal(timing.targetTemperature, 72);
});

test('al llegar al final del protocolo se queda en hold indefinidamente', () => {
  const timing = resolveTiming(protocolo(), 690, 690);
  assert.equal(timing.phase, 'hold');
  assert.equal(timing.targetTemperature, 4);
  assert.equal(timing.remainingInPhaseSeconds, Infinity);
  assert.equal(timing.progressFraction, 1);
});

test('un protocolo sin hold acaba en "completed"', () => {
  const sinHold = { ...protocolo(), hold: undefined };
  const timing = resolveTiming(sinHold, 690, 690);
  assert.equal(timing.phase, 'completed');
});
