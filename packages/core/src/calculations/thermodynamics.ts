import { Primer } from '../knowledge/entities/primer';
import { CalculationResult, calculated, notCalculable, round1 } from './types';
import { analyzeSequence } from './primer-analysis';

// Umbral clásico de la regla de Wallace: por debajo se usa esa fórmula,
// por encima una basada en %GC. Ninguna sustituye una Tm experimental o
// del fabricante, por eso se marcan con confidence 'low' y warnings.
const WALLACE_THRESHOLD_NT = 14;
const SALT_WARNING = 'no tiene en cuenta la concentración de sales ni la de primer';

export function calculateTm(sequence: string): CalculationResult<number> {
  const a = analyzeSequence(sequence);
  if (!a.ok) return notCalculable(a.reason);
  const { length, gc, at } = a.stats;

  if (length < WALLACE_THRESHOLD_NT) {
    return calculated(2 * at + 4 * gc, {
      unit: 'C',
      method: 'regla de Wallace: 2×(A+T) + 4×(G+C), para oligos cortos',
      confidence: 'low',
      warnings: ['estimación simplificada pensada para primers muy cortos (<14 nt)', SALT_WARNING],
    });
  }

  return calculated(round1(64.9 + (41 * (gc - 16.4)) / length), {
    unit: 'C',
    method: 'fórmula basada en %GC: 64.9 + 41×(nGC−16.4)/N',
    confidence: 'low',
    warnings: [SALT_WARNING, 'para un valor fiable, usar la ficha del fabricante o un calculador de oligos dedicado'],
  });
}

export interface AnnealingRange {
  recommended: number;
  min: number;
  max: number;
}

// Regla práctica: la annealing se empieza a probar en (Tm más baja de
// los dos primers) − 5 °C, con ±2 °C de margen para el gradiente.
export function calculateAnnealingTemperatureRange(
  primerForward: Pick<Primer, 'secuencia'>,
  primerReverse: Pick<Primer, 'secuencia'>,
): CalculationResult<AnnealingRange> {
  const tmF = calculateTm(primerForward.secuencia);
  if (!tmF.ok) return notCalculable(`no se pudo calcular la Tm del primer forward: ${tmF.reason}`);
  const tmR = calculateTm(primerReverse.secuencia);
  if (!tmR.ok) return notCalculable(`no se pudo calcular la Tm del primer reverse: ${tmR.reason}`);

  const recommended = round1(Math.min(tmF.result.value, tmR.result.value) - 5);
  return calculated(
    { recommended, min: round1(recommended - 2), max: round1(recommended + 2) },
    {
      method: 'Tm más baja de los dos primers, menos 5°C, con margen ±2°C',
      confidence: 'low',
      warnings: ['heurística habitual de diseño de PCR, no sustituye un gradiente de annealing experimental'],
    },
  );
}
