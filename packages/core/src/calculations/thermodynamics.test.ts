import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnnealingTemperatureRange, calculateTm } from './thermodynamics';
import { Primer } from '../knowledge/entities/primer';

function makePrimer(id: string, secuencia: string): Primer {
  return { id, nombre: id, secuencia };
}

test('calculateTm: regla de Wallace para un oligo corto (<14 nt)', () => {
  // AATTGGCC: A=2, T=2, G=2, C=2 -> 2*(A+T) + 4*(G+C) = 2*4 + 4*4 = 24
  const result = calculateTm('AATTGGCC');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.value, 24);
    assert.match(result.result.method ?? '', /Wallace/);
  }
});

test('calculateTm: fórmula por %GC para un primer largo (>=14 nt)', () => {
  // 20 nt, 50% GC -> 64.9 + 41*(10 - 16.4)/20 = 64.9 - 13.12 = 51.78 -> 51.8
  const result = calculateTm('GCGCGCGCGCATATATATAT');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.value, 51.8);
    assert.match(result.result.method ?? '', /%GC/);
  }
});

test('calculateTm: secuencia inválida no se puede calcular', () => {
  const result = calculateTm('ACGTXYZ');
  assert.equal(result.ok, false);
});

test('calculateAnnealingTemperatureRange: usa la Tm más baja de los dos primers', () => {
  const corto = makePrimer('corto', 'AATTGGCC'); // Tm = 24
  const largo = makePrimer('largo', 'GCGCGCGCGCATATATATAT'); // Tm = 51.8

  const result = calculateAnnealingTemperatureRange(corto, largo);
  assert.equal(result.ok, true);
  if (result.ok) {
    // Tm más baja es la del primer corto (24), recomendado = 24 - 5 = 19
    assert.equal(result.result.value.recommended, 19);
    assert.equal(result.result.value.min, 17);
    assert.equal(result.result.value.max, 21);
  }
});

test('calculateAnnealingTemperatureRange: si un primer no se puede analizar, no da un resultado inventado', () => {
  const valido = makePrimer('valido', 'GCGCGCGCGCATATATATAT');
  const invalido = makePrimer('invalido', 'ACGTXYZ');

  const result = calculateAnnealingTemperatureRange(valido, invalido);
  assert.equal(result.ok, false);
});
