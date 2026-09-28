import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoKnowledgeBase } from './seed-data';

test('guarda y recupera un primer por id', () => {
  const kb = buildDemoKnowledgeBase();
  const primer = kb.getPrimer('primer-fwd-demo');
  assert.ok(primer);
  assert.equal(primer?.nombre, 'Demo-FWD');
});

test('devuelve los buffers compatibles de una polimerasa', () => {
  const kb = buildDemoKnowledgeBase();
  const buffers = kb.getCompatibleBuffers('poly-taq-demo');
  assert.equal(buffers.length, 1);
  assert.equal(buffers[0].id, 'buffer-standard-demo');
});

test('detecta que una polimerasa y un buffer NO son compatibles si no hay relación', () => {
  const kb = buildDemoKnowledgeBase();
  const compatible = kb.isPolymeraseBufferCompatible('poly-taq-demo', 'buffer-que-no-existe');
  assert.equal(compatible, false);
});

test('reconstruye todos los componentes de un ensayo a partir de sus ids', () => {
  const kb = buildDemoKnowledgeBase();
  const components = kb.getAssayComponents('assay-demo');
  assert.ok(components);
  assert.equal(components?.primerForward?.id, 'primer-fwd-demo');
  assert.equal(components?.polymerase?.id, 'poly-taq-demo');
  assert.equal(components?.referenceProtocol?.id, 'protocol-demo-3step');
});

test('el protocolo demo respeta la estructura de 3 pasos por ciclo de la spec', () => {
  const kb = buildDemoKnowledgeBase();
  const protocol = kb.getProtocol('protocol-demo-3step');
  assert.ok(protocol);
  assert.equal(protocol?.cycles.count, 35);
  assert.equal(protocol?.cycles.steps.length, 3);
  assert.equal(protocol?.cycles.steps[1].type, 'annealing');
});
