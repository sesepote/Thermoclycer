import { SourcedValue, SourceType } from '../types/common';

// Principio de la sección 22 de la spec: el motor no "inventa" valores.
// Un cálculo nunca devuelve un número suelto, sino este tipo, que obliga
// a manejar explícitamente el caso en que no se pudo calcular.
export type CalculationResult<T> =
  | { ok: true; result: SourcedValue<T> }
  | { ok: false; reason: string };

export function calculated<T>(
  value: T,
  opts: Partial<Omit<SourcedValue<T>, 'value' | 'origin'>> = {},
): CalculationResult<T> {
  return { ok: true, result: { value, origin: SourceType.CALCULATED, ...opts } };
}

export function notCalculable(reason: string): CalculationResult<never> {
  return { ok: false, reason };
}

export const round1 = (x: number): number => Math.round(x * 10) / 10;
