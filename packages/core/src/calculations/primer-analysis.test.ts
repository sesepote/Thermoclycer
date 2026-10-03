import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSequence, calculateGcContent, calculateLength } from './primer-analysis';

test('calculateLength: cuenta bien la longitud de una secuencia válida', () => {
  const result = calculateLength('ACGTACGT');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.value, 8);
});

test('calculateLength: secuencia vacía no se puede calcular', () => {
  const result = calculateLength('   ');
  assert.equal(result.ok, false);
});

test('calculateGcContent: 100% GC', () => {
  const result = calculateGcContent('GCGC');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.value, 100);
});

test('calculateGcContent: 0% GC', () => {
  const result = calculateGcContent('ATAT');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.value, 0);
});

test('calculateGcContent: 50% GC', () => {
  const result = calculateGcContent('ATGC');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.value, 50);
});

test('calculateGcContent: rechaza caracteres que no son A/C/G/T', () => {
  const result = calculateGcContent('ACGTN');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /no reconocido/);
});

test('analyzeSequence: normaliza y cuenta cada base en una sola pasada', () => {
  const result = analyzeSequence('  aacgtG ');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.stats.bases, 'AACGTG');
    assert.deepEqual(result.stats.counts, { A: 2, C: 1, G: 2, T: 1 });
    assert.equal(result.stats.gc, 3);
    assert.equal(result.stats.at, 3);
  }
});
