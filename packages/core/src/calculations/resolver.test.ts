import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RuleEngine } from '../rules/engine';
import { annealingConstraintsRule } from '../rules/definitions/example-rules';
import { buildDemoKnowledgeBase } from '../knowledge/seed-data';
import { buildDefaultCalculationResolver } from './default-registry';
import { CalculationResolver } from './resolver';

test('el resolver resuelve un pendingCalculation dejado por el motor de reglas', () => {
  const kb = buildDemoKnowledgeBase();
  const engine = new RuleEngine();

  const { facts } = engine.run([annealingConstraintsRule], {
    primerPair: { compatible: true, forward: 'primer-fwd-demo', reverse: 'primer-rev-demo' },
  });

  // Antes de resolver, sigue siendo una marca pendiente
  assert.ok((facts.annealingConstraints as { pendingCalculation: string }).pendingCalculation);

  const resolver = buildDefaultCalculationResolver();
  const resolved = resolver.resolve(facts, kb);

  const outcome = resolved.annealingConstraints as { ok: boolean; result?: { value: { recommended: number } } };
  assert.equal(outcome.ok, true);
  assert.equal(typeof outcome.result?.value.recommended, 'number');
});

test('el resolver informa con claridad si la función pedida no está registrada', () => {
  const kb = buildDemoKnowledgeBase();
  const resolver = new CalculationResolver();

  const facts = { algo: { pendingCalculation: 'funcionQueNoExiste', args: {} } };
  const resolved = resolver.resolve(facts, kb);

  const outcome = resolved.algo as { ok: boolean; reason: string };
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /no hay ninguna función/);
});
