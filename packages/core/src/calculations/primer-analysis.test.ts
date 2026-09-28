import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGcContent, calculateLength } from './primer-analysis';

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
