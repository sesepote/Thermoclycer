import { Rule } from '../knowledge/entities/rule';
import { Action } from './action';
import { evaluateCondition } from './condition';
import { getPath, setPath } from './path';
import { SourceType } from '../types/common';

export interface RuleTraceEntry {
  ruleId: string;
  ruleNombre: string;
  fuente?: string;
  version: string;
  actionsApplied: Action[];
}

export interface RuleEngineResult {
  facts: Record<string, unknown>;
  trace: RuleTraceEntry[];
}

// Motor genérico: no sabe nada de PCR, solo evalúa condiciones contra
// unos hechos y aplica acciones (sección 7: las reglas cambian sin tocar
// ni la interfaz ni este motor).
//
// Orden: prioridad más alta primero; a igualdad, orden de llegada. Se
// aplican TODAS las reglas activas que se cumplen, no solo la primera.
export class RuleEngine {
  run(rules: Rule[], context: Record<string, unknown>): RuleEngineResult {
    const facts = structuredClone(context);
    const trace: RuleTraceEntry[] = [];

    const ordered = rules
      .map((rule, index) => ({ rule, index }))
      .filter(({ rule }) => rule.activa)
      .sort((a, b) => b.rule.prioridad - a.rule.prioridad || a.index - b.index);

    for (const { rule } of ordered) {
      if (!evaluateCondition(rule.condiciones, facts)) continue;
      const actions = Array.isArray(rule.accion) ? rule.accion : [rule.accion];
      for (const action of actions) applyAction(action, facts);
      trace.push({ ruleId: rule.id, ruleNombre: rule.nombre, fuente: rule.fuente, version: rule.version, actionsApplied: actions });
    }

    return { facts, trace };
  }
}

function applyAction(action: Action, facts: Record<string, unknown>): void {
  switch (action.op) {
    case 'set':
      return setPath(facts, action.path, action.value);
    case 'copy':
      return setPath(facts, action.path, getPath(facts, action.fromPath));
    case 'flag':
      return setPath(facts, action.path, action.status);
    case 'derive': {
      const { op: _op, path, ...rest } = action;
      return setPath(facts, path, { ...rest, origin: SourceType.RULE_DERIVED });
    }
    case 'invoke':
      // No se calcula aquí: se deja la marca para el CalculationResolver.
      return setPath(facts, action.resultPath, { pendingCalculation: action.function, args: action.args ?? {} });
  }
}
