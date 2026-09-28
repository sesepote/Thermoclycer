import { CalculationResult, calculated, notCalculable } from './types';

const VALID_BASES = new Set(['A', 'C', 'G', 'T']);

// De momento solo se admite ACGT, sin códigos IUPAC de ambigüedad
// (R, Y, N...). Si hace falta soportarlos, es un cambio localizado aquí.
function normalizeSequence(sequence: string): { ok: true; bases: string } | { ok: false; reason: string } {
  const bases = sequence.trim().toUpperCase();
  if (bases.length === 0) return { ok: false, reason: 'la secuencia está vacía' };
  for (const base of bases) {
    if (!VALID_BASES.has(base)) {
      return {
        ok: false,
        reason: `carácter no reconocido en la secuencia: "${base}" (solo se admiten A, C, G, T)`,
      };
    }
  }
  return { ok: true, bases };
}

export function calculateLength(sequence: string): CalculationResult<number> {
  const parsed = normalizeSequence(sequence);
  if (!parsed.ok) return notCalculable(parsed.reason);
  return calculated(parsed.bases.length, {
    unit: 'nt',
    method: 'longitud de la secuencia',
    confidence: 'high',
  });
}

export function calculateGcContent(sequence: string): CalculationResult<number> {
  const parsed = normalizeSequence(sequence);
  if (!parsed.ok) return notCalculable(parsed.reason);

  const gcCount = [...parsed.bases].filter(b => b === 'G' || b === 'C').length;
  const percentage = Math.round((gcCount / parsed.bases.length) * 1000) / 10;

  return calculated(percentage, {
    unit: '%',
    method: 'conteo de G+C sobre la longitud total de la secuencia',
    confidence: 'high',
  });
}
