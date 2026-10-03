import { KnowledgeBase } from '../knowledge/knowledge-base';
import { getPath } from '../rules/path';
import { CalculationResult } from './types';

export type CalculationFunction = (args: Record<string, unknown>, kb: KnowledgeBase) => CalculationResult<unknown>;

interface PendingCalculation {
  pendingCalculation: string;
  args: Record<string, unknown>;
}

const isPending = (v: unknown): v is PendingCalculation =>
  typeof v === 'object' && v !== null && typeof (v as PendingCalculation).pendingCalculation === 'string';

// El motor de reglas (acción "invoke") deja marcas de "esto hay que
// calcularlo". Este resolver sustituye cada marca por el resultado de la
// función registrada con ese nombre.
export class CalculationResolver {
  private readonly registry = new Map<string, CalculationFunction>();

  register(name: string, fn: CalculationFunction): this {
    this.registry.set(name, fn);
    return this;
  }

  resolve(facts: Record<string, unknown>, kb: KnowledgeBase): Record<string, unknown> {
    const updated = { ...facts };

    for (const [key, value] of Object.entries(facts)) {
      if (!isPending(value)) continue;

      const fn = this.registry.get(value.pendingCalculation);
      if (!fn) {
        updated[key] = { ok: false, reason: `no hay ninguna función de cálculo registrada con el nombre "${value.pendingCalculation}"` };
        continue;
      }

      // Los argumentos de texto son rutas dentro de los propios facts;
      // si la ruta no existe se pasa el literal tal cual.
      const args = Object.fromEntries(
        Object.entries(value.args).map(([k, v]) => [k, typeof v === 'string' ? getPath(facts, v) ?? v : v]),
      );
      updated[key] = fn(args, kb);
    }

    return updated;
  }
}
