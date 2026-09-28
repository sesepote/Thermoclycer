import { getPath } from './path';

// Un ValueRef permite que una condición numérica compare contra un
// literal (58) o contra otro dato del contexto ({ ref: 'rango.min' }).
// Esto es lo que hace falta para reglas como la del ejemplo de la spec:
// "IF user_temperature >= minimum AND user_temperature <= maximum",
// donde "minimum" no es un número fijo sino otro campo del contexto.
export type ValueRef = number | { ref: string };

export type Condition =
  | { op: 'eq'; path: string; value: unknown }
  | { op: 'neq'; path: string; value: unknown }
  | { op: 'gt'; path: string; value: ValueRef }
  | { op: 'gte'; path: string; value: ValueRef }
  | { op: 'lt'; path: string; value: ValueRef }
  | { op: 'lte'; path: string; value: ValueRef }
  | { op: 'in'; path: string; values: unknown[] }
  | { op: 'and'; conditions: Condition[] }
  | { op: 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition };

function resolveNumber(ref: ValueRef, context: unknown): number {
  const raw = typeof ref === 'number' ? ref : getPath(context, ref.ref);
  return typeof raw === 'number' ? raw : NaN;
}

export function evaluateCondition(condition: Condition, context: unknown): boolean {
  switch (condition.op) {
    case 'eq':
      return getPath(context, condition.path) === condition.value;
    case 'neq':
      return getPath(context, condition.path) !== condition.value;
    case 'gt':
      return numberAt(condition.path, context) > resolveNumber(condition.value, context);
    case 'gte':
      return numberAt(condition.path, context) >= resolveNumber(condition.value, context);
    case 'lt':
      return numberAt(condition.path, context) < resolveNumber(condition.value, context);
    case 'lte':
      return numberAt(condition.path, context) <= resolveNumber(condition.value, context);
    case 'in':
      return condition.values.includes(getPath(context, condition.path));
    case 'and':
      return condition.conditions.every(c => evaluateCondition(c, context));
    case 'or':
      return condition.conditions.some(c => evaluateCondition(c, context));
    case 'not':
      return !evaluateCondition(condition.condition, context);
  }
}

function numberAt(path: string, context: unknown): number {
  const raw = getPath(context, path);
  return typeof raw === 'number' ? raw : NaN;
}
