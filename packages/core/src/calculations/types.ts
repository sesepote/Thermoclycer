import { SourcedValue, SourceType } from '../types/common';

// El principio de la sección 22 de la spec es que el motor no puede
// "inventar" un valor cuando no hay datos suficientes. Por eso un
// cálculo nunca devuelve directamente un número: devuelve esto, que
// obliga a manejar explícitamente el caso en que no se pudo calcular.
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
