import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCondition } from './condition';
import { RuleEngine } from './engine';
import { exampleRules } from './definitions/example-rules';
import { Rule } from '../knowledge/entities/rule';

test('evaluateCondition: comparaciones numéricas básicas', () => {
  assert.equal(evaluateCondition({ op: 'gte', path: 'x', value: 5 }, { x: 5 }), true);
  assert.equal(evaluateCondition({ op: 'gte', path: 'x', value: 5 }, { x: 4.9 }), false);
  assert.equal(evaluateCondition({ op: 'lte', path: 'x', value: 10 }, { x: 10 }), true);
});

test('evaluateCondition: comparación contra otro campo del contexto (ValueRef)', () => {
  const condition = { op: 'gte' as const, path: 'temp', value: { ref: 'rango.min' } };
  assert.equal(evaluateCondition(condition, { temp: 60, rango: { min: 58 } }), true);
  assert.equal(evaluateCondition(condition, { temp: 50, rango: { min: 58 } }), false);
});

test('evaluateCondition: and/or/not se combinan correctamente', () => {
  const dentroDeRango = {
    op: 'and' as const,
    conditions: [
      { op: 'gte' as const, path: 'temp', value: 58 },
      { op: 'lte' as const, path: 'temp', value: 62 },
    ],
  };
  assert.equal(evaluateCondition(dentroDeRango, { temp: 60 }), true);
  assert.equal(evaluateCondition(dentroDeRango, { temp: 70 }), false);
  assert.equal(evaluateCondition({ op: 'not', condition: dentroDeRango }, { temp: 70 }), true);
});

test('RuleEngine: regla de compatibilidad de buffer se dispara y queda RULE_DERIVED', () => {
  const engine = new RuleEngine();
  const { facts, trace } = engine.run(
    [exampleRules[0]],
    { polymerase: { id: 'poly-taq-demo' } },
  );

  assert.equal(trace.length, 1);
  assert.equal(trace[0].ruleId, 'rule-buffer-compat-taq');
  assert.deepEqual((facts.compatibleBuffers as { value: unknown }).value, ['buffer-standard-demo']);
  assert.equal((facts.compatibleBuffers as { origin: string }).origin, 'RULE_DERIVED');
});

test('RuleEngine: una regla cuya condición no se cumple no deja rastro', () => {
  const engine = new RuleEngine();
  const { trace } = engine.run(
    [exampleRules[0]],
    { polymerase: { id: 'otra-polimerasa' } },
  );
  assert.equal(trace.length, 0);
});

test('RuleEngine: una regla inactiva nunca se evalúa aunque su condición se cumpla', () => {
  const engine = new RuleEngine();
  const reglaInactiva: Rule = { ...exampleRules[0], activa: false };
  const { trace } = engine.run([reglaInactiva], { polymerase: { id: 'poly-taq-demo' } });
  assert.equal(trace.length, 0);
});

test('RuleEngine: acción invoke deja constancia de qué habría que calcular, sin calcularlo', () => {
  const engine = new RuleEngine();
  const { facts, trace } = engine.run(
    [exampleRules[1]],
    { primerPair: { compatible: true, forward: 'primer-fwd-demo', reverse: 'primer-rev-demo' } },
  );

  assert.equal(trace.length, 1);
  const pending = facts.annealingConstraints as { pendingCalculation: string };
  assert.equal(pending.pendingCalculation, 'calculateAnnealingConstraints');
});

test('RuleEngine: temperatura de annealing dentro de rango se marca ACCEPTED', () => {
  const engine = new RuleEngine();
  const { facts } = engine.run(
    [exampleRules[2]],
    { userInput: { annealingTemperature: 60 }, expectedRange: { min: 58, max: 62 } },
  );

  const evaluation = facts.evaluation as { annealingTemperature: { status: string } };
  assert.equal(evaluation.annealingTemperature.status, 'ACCEPTED');
});

test('RuleEngine: temperatura fuera de rango no dispara la regla de aceptación', () => {
  const engine = new RuleEngine();
  const { facts } = engine.run(
    [exampleRules[2]],
    { userInput: { annealingTemperature: 55 }, expectedRange: { min: 58, max: 62 } },
  );
  assert.equal(facts.evaluation, undefined);
});

test('RuleEngine: prioridad más alta se evalúa primero (orden en el trace)', () => {
  const engine = new RuleEngine();
  const { trace } = engine.run(
    exampleRules,
    {
      polymerase: { id: 'poly-taq-demo' },
      primerPair: { compatible: true, forward: 'a', reverse: 'b' },
      userInput: { annealingTemperature: 60 },
      expectedRange: { min: 58, max: 62 },
    },
  );

  assert.equal(trace.length, 3);
  assert.equal(trace[0].ruleId, 'rule-buffer-compat-taq'); // prioridad 10
  assert.equal(trace[1].ruleId, 'rule-annealing-constraints'); // prioridad 5
  assert.equal(trace[2].ruleId, 'rule-annealing-temp-accepted'); // prioridad 1
});
