import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareProtocols } from './validator';
import { Protocol } from '../knowledge/entities/protocol';
import { ParameterComparison } from './types';

function referencia(): Protocol {
  return {
    id: 'ref',
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

function find(comparisons: ParameterComparison[], name: string): ParameterComparison | undefined {
  return comparisons.find(c => c.name === name);
}

test('un protocolo idéntico al de referencia sale todo EXACT', () => {
  const comparisons = compareProtocols(referencia(), referencia());
  assert.ok(comparisons.every(c => c.status === 'EXACT'));
});

test('una temperatura de annealing un poco alta pero dentro de tolerancia es ACCEPTED_RANGE', () => {
  const candidato = referencia();
  candidato.cycles.steps[1].temperature = 61; // referencia 60, tolerancia de pasos ±2
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[1].temperature');
  assert.equal(cmp?.status, 'ACCEPTED_RANGE');
  assert.equal(cmp?.errorType, undefined);
});

test('una temperatura de annealing muy baja se marca OUT_OF_RANGE con TEMPERATURE_TOO_LOW', () => {
  const candidato = referencia();
  candidato.cycles.steps[1].temperature = 55; // referencia 60, tolerancia ±2 -> fuera
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[1].temperature');
  assert.equal(cmp?.status, 'OUT_OF_RANGE');
  assert.equal(cmp?.errorType, 'TEMPERATURE_TOO_LOW');
});

test('una duración de extensión demasiado larga se marca TIME_TOO_LONG', () => {
  const candidato = referencia();
  candidato.cycles.steps[2].durationSeconds = 90; // referencia 45, tolerancia ±10
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[2].durationSeconds');
  assert.equal(cmp?.status, 'OUT_OF_RANGE');
  assert.equal(cmp?.errorType, 'TIME_TOO_LONG');
});

test('el número de ciclos no admite tolerancia: cualquier diferencia es OUT_OF_RANGE', () => {
  const candidato = referencia();
  candidato.cycles.count = 30;
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.count');
  assert.equal(cmp?.status, 'OUT_OF_RANGE');
  assert.equal(cmp?.errorType, 'CYCLE_COUNT_TOO_LOW');
});

test('detecta un paso que falta en el ciclo', () => {
  const candidato = referencia();
  candidato.cycles.steps = candidato.cycles.steps.slice(0, 2); // se deja fuera "extension"
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[2]');
  assert.equal(cmp?.status, 'MISSING');
  assert.equal(cmp?.errorType, 'MISSING_STEP');
});

test('detecta un paso de más en el ciclo', () => {
  const candidato = referencia();
  candidato.cycles.steps.push({ type: 'custom', label: 'extra', temperature: 37, durationSeconds: 10 });
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[3]');
  assert.equal(cmp?.status, 'INVALID');
  assert.equal(cmp?.errorType, 'EXTRA_STEP');
});

test('detecta los pasos en orden incorrecto cuando están todos presentes', () => {
  const candidato = referencia();
  const [denat, anneal, ext] = candidato.cycles.steps;
  candidato.cycles.steps = [anneal, denat, ext]; // denaturation y annealing cambiados de orden
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps');
  assert.equal(cmp?.status, 'INVALID');
  assert.equal(cmp?.errorType, 'WRONG_ORDER');
});

test('detecta un tipo de paso incompatible en una posición concreta', () => {
  const candidato = referencia();
  candidato.cycles.steps[1] = { type: 'custom', label: 'paso raro', temperature: 60, durationSeconds: 30 };
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'cycles.steps[1]');
  assert.equal(cmp?.status, 'INVALID');
  assert.equal(cmp?.errorType, 'INCOMPATIBLE_PARAMETER');
});

test('detecta que falta la fase inicial de desnaturalización', () => {
  const candidato = referencia();
  candidato.initial = undefined;
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'initial');
  assert.equal(cmp?.status, 'MISSING');
  assert.equal(cmp?.errorType, 'MISSING_STEP');
});

test('detecta una fase extra que la referencia no contempla', () => {
  const esperado = referencia();
  esperado.finalExtension = undefined;
  const comparisons = compareProtocols(esperado, referencia());
  const cmp = find(comparisons, 'final_extension');
  assert.equal(cmp?.status, 'INVALID');
  assert.equal(cmp?.errorType, 'EXTRA_STEP');
});

test('una diferencia en el hold se informa pero no se trata como error grave', () => {
  const candidato = referencia();
  candidato.hold = { temperature: 10 };
  const comparisons = compareProtocols(referencia(), candidato);
  const cmp = find(comparisons, 'hold.temperature');
  assert.equal(cmp?.status, 'ACCEPTED_RANGE');
  assert.equal(cmp?.errorType, undefined);
});
