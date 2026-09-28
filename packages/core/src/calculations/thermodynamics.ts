import { Primer } from '../knowledge/entities/primer';
import { CalculationResult, calculated, notCalculable } from './types';
import { calculateGcContent, calculateLength } from './primer-analysis';

// Umbral clásico de la regla de Wallace: por debajo de esto se usa esa
// fórmula, por encima una basada en %GC. Ninguna de las dos sustituye
// una Tm medida experimentalmente o dada por el fabricante del primer:
// por eso se marcan siempre con confidence 'low' y con warnings.
const WALLACE_THRESHOLD_NT = 14;

export function calculateTm(sequence: string): CalculationResult<number> {
  const lengthResult = calculateLength(sequence);
  if (!lengthResult.ok) return lengthResult;
  const gcResult = calculateGcContent(sequence);
  if (!gcResult.ok) return gcResult;

  const bases = sequence.trim().toUpperCase();
  const length = lengthResult.result.value;

  if (length < WALLACE_THRESHOLD_NT) {
    const at = [...bases].filter(b => b === 'A' || b === 'T').length;
    const gc = [...bases].filter(b => b === 'G' || b === 'C').length;
    const tm = 2 * at + 4 * gc;

    return calculated(tm, {
      unit: 'C',
      method: 'regla de Wallace: 2×(A+T) + 4×(G+C), para oligos cortos',
      confidence: 'low',
      warnings: [
        'estimación simplificada pensada para primers muy cortos (<14 nt)',
        'no tiene en cuenta la concentración de sales ni la de primer',
      ],
    });
  }

  const gcPercent = gcResult.result.value;
  const gcCount = (gcPercent / 100) * length;
  const tm = 64.9 + (41 * (gcCount - 16.4)) / length;

  return calculated(Math.round(tm * 10) / 10, {
    unit: 'C',
    method: 'fórmula basada en %GC: 64.9 + 41×(nGC−16.4)/N',
    confidence: 'low',
    warnings: [
      'estimación simplificada, no tiene en cuenta sales ni concentración de primer',
      'para un valor fiable, usar la ficha del fabricante o un calculador de oligos dedicado',
    ],
  });
}

export interface AnnealingRange {
  recommended: number;
  min: number;
  max: number;
}

// Regla práctica habitual: la temperatura de annealing se empieza a
// probar en (Tm más baja de los dos primers) − 5°C, con un margen de
// ±2°C alrededor para el gradiente. No es un cálculo exacto: es punto
// de partida razonable, así se marca en el resultado.
export function calculateAnnealingTemperatureRange(
  primerForward: Primer,
  primerReverse: Primer,
): CalculationResult<AnnealingRange> {
  const tmForward = calculateTm(primerForward.secuencia);
  if (!tmForward.ok) {
    return notCalculable(`no se pudo calcular la Tm del primer forward: ${tmForward.reason}`);
  }
  const tmReverse = calculateTm(primerReverse.secuencia);
  if (!tmReverse.ok) {
    return notCalculable(`no se pudo calcular la Tm del primer reverse: ${tmReverse.reason}`);
  }

  const lowerTm = Math.min(tmForward.result.value, tmReverse.result.value);
  const recommended = Math.round((lowerTm - 5) * 10) / 10;

  return calculated(
    { recommended, min: Math.round((recommended - 2) * 10) / 10, max: Math.round((recommended + 2) * 10) / 10 },
    {
      method: 'Tm más baja de los dos primers, menos 5°C, con margen ±2°C',
      confidence: 'low',
      warnings: [
        'heurística habitual de diseño de PCR, no sustituye un gradiente de annealing experimental',
      ],
    },
  );
}
