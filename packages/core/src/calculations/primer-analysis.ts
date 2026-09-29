import { CalculationResult, calculated, notCalculable, round1 } from './types';

export type Base = 'A' | 'C' | 'G' | 'T';

export interface SequenceStats {
  bases: string; // normalizada: sin espacios en los extremos y en mayúsculas
  length: number;
  counts: Record<Base, number>;
  gc: number;
  at: number;
}

export type SequenceAnalysis = { ok: true; stats: SequenceStats } | { ok: false; reason: string };

// Normaliza, valida y cuenta bases en una sola pasada. Todos los
// cálculos de primers parten de aquí para no recorrer la secuencia
// varias veces. Solo se admite ACGT (sin códigos IUPAC de ambigüedad).
export function analyzeSequence(sequence: string): SequenceAnalysis {
  const bases = sequence.trim().toUpperCase();
  if (!bases) return { ok: false, reason: 'la secuencia está vacía' };

  const counts: Record<Base, number> = { A: 0, C: 0, G: 0, T: 0 };
  for (const b of bases) {
    if (!(b in counts)) {
      return { ok: false, reason: `carácter no reconocido en la secuencia: "${b}" (solo se admiten A, C, G, T)` };
    }
    counts[b as Base]++;
  }

  const gc = counts.G + counts.C;
  return { ok: true, stats: { bases, length: bases.length, counts, gc, at: bases.length - gc } };
}

export function calculateLength(sequence: string): CalculationResult<number> {
  const a = analyzeSequence(sequence);
  if (!a.ok) return notCalculable(a.reason);
  return calculated(a.stats.length, { unit: 'nt', method: 'longitud de la secuencia', confidence: 'high' });
}

export function calculateGcContent(sequence: string): CalculationResult<number> {
  const a = analyzeSequence(sequence);
  if (!a.ok) return notCalculable(a.reason);
  return calculated(round1((a.stats.gc / a.stats.length) * 100), {
    unit: '%',
    method: 'conteo de G+C sobre la longitud total de la secuencia',
    confidence: 'high',
  });
}
