import { getPath } from './path';

// Un ValueRef compara contra un literal (58) o contra otro dato del
// contexto ({ ref: 'rango.min' }), para reglas como "IF temp >= minimum",
// donde "minimum" es otro campo de los hechos.
export type ValueRef = number | { ref: string };

type NumericOp = 'gt' | 'gte' | 'lt' | 'lte';

export type Condition =
  | { op: 'eq' | 'neq'; path: string; value: unknown }
  | { op: NumericOp; path: string; value: ValueRef }
  | { op: 'in'; path: string; values: unknown[] }
  | { op: 'and' | 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition };

// Tabla de comparadores numéricos: añadir un operador es añadir una línea.
const NUMERIC: Record<NumericOp, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
};

// Cualquier dato no numérico se trata como NaN, que hace falsa toda comparación.
const toNumber = (raw: unknown): number => (typeof raw === 'number' ? raw : NaN);

export function evaluateCondition(condition: Condition, context: unknown): boolean {
  switch (condition.op) {
    case 'eq':
      return getPath(context, condition.path) === condition.value;
    case 'neq':
      return getPath(context, condition.path) !== condition.value;
    case 'in':
      return condition.values.includes(getPath(context, condition.path));
    case 'and':
      return condition.conditions.every(c => evaluateCondition(c, context));
    case 'or':
      return condition.conditions.some(c => evaluateCondition(c, context));
    case 'not':
      return !evaluateCondition(condition.condition, context);
    default: {
      const { op, path, value } = condition;
      const rhs = typeof value === 'number' ? value : toNumber(getPath(context, value.ref));
      return NUMERIC[op](toNumber(getPath(context, path)), rhs);
    }
  }
}
