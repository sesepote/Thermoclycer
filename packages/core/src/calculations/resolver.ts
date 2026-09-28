import { KnowledgeBase } from '../knowledge/knowledge-base';
import { getPath } from '../rules/path';
import { CalculationResult } from './types';

export type CalculationFunction = (
  args: Record<string, unknown>,
  kb: KnowledgeBase,
) => CalculationResult<unknown>;

interface PendingCalculation {
  pendingCalculation: string;
  args: Record<string, unknown>;
}

function isPendingCalculation(value: unknown): value is PendingCalculation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).pendingCalculation === 'string'
  );
}

// El motor de reglas (rules/engine.ts, acción "invoke") deja marcas de
// "esto hay que calcularlo" en vez de calcularlo él mismo. Este
// resolver recorre esas marcas y llama a la función de cálculo
// registrada con ese nombre, sustituyendo la marca por el resultado.
export class CalculationResolver {
  private registry = new Map<string, CalculationFunction>();

  register(name: string, fn: CalculationFunction): void {
    this.registry.set(name, fn);
  }

  resolve(facts: Record<string, unknown>, kb: KnowledgeBase): Record<string, unknown> {
    const updated: Record<string, unknown> = { ...facts };

    for (const [key, value] of Object.entries(updated)) {
      if (!isPendingCalculation(value)) continue;

      const fn = this.registry.get(value.pendingCalculation);
      if (!fn) {
        updated[key] = {
          ok: false,
          reason: `no hay ninguna función de cálculo registrada con el nombre "${value.pendingCalculation}"`,
        };
        continue;
      }

      const resolvedArgs: Record<string, unknown> = {};
      for (const [argName, argValue] of Object.entries(value.args)) {
        // Los argumentos de la regla son rutas dentro de los propios
        // "facts" (ver definitions/example-rules.ts), no valores literales.
        resolvedArgs[argName] = typeof argValue === 'string' ? getPath(facts, argValue) ?? argValue : argValue;
      }

      updated[key] = fn(resolvedArgs, kb);
    }

    return updated;
  }
}
