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

// Motor de reglas: no sabe nada de PCR ni de termocicladores, solo sabe
// evaluar condiciones contra un objeto de hechos y aplicar acciones.
// Esto es a propósito lo que dice la sección 7 de la spec: las reglas
// tienen que poder cambiar sin tocar la interfaz ni este motor.
//
// Nota de diseño: prioridad más alta se ejecuta primero. A igualdad de
// prioridad, se respeta el orden de llegada (orden estable). Se evalúan
// TODAS las reglas activas cuya condición se cumple, no solo la
// primera que matchea, porque las reglas del dominio (compatibilidad,
// rangos, etc.) normalmente son independientes entre sí.
export class RuleEngine {
  run(rules: Rule[], context: Record<string, unknown>): RuleEngineResult {
    const facts: Record<string, unknown> = JSON.parse(JSON.stringify(context));
    const trace: RuleTraceEntry[] = [];

    const ordered = rules
      .map((rule, index) => ({ rule, index }))
      .filter(({ rule }) => rule.activa)
      .sort((a, b) => b.rule.prioridad - a.rule.prioridad || a.index - b.index)
      .map(({ rule }) => rule);

    for (const rule of ordered) {
      if (!evaluateCondition(rule.condiciones, facts)) continue;

      const actions = Array.isArray(rule.accion) ? rule.accion : [rule.accion];
      for (const action of actions) {
        this.applyAction(action, facts);
      }

      trace.push({
        ruleId: rule.id,
        ruleNombre: rule.nombre,
        fuente: rule.fuente,
        version: rule.version,
        actionsApplied: actions,
      });
    }

    return { facts, trace };
  }

  private applyAction(action: Action, facts: Record<string, unknown>): void {
    switch (action.op) {
      case 'set':
        setPath(facts, action.path, action.value);
        break;
      case 'copy':
        setPath(facts, action.path, getPath(facts, action.fromPath));
        break;
      case 'derive':
        setPath(facts, action.path, {
          value: action.value,
          unit: action.unit,
          origin: SourceType.RULE_DERIVED,
          method: action.method,
          confidence: action.confidence,
          warnings: action.warnings,
        });
        break;
      case 'flag':
        setPath(facts, action.path, action.status);
        break;
      case 'invoke':
        // El motor de reglas no calcula nada: deja constancia de que
        // aquí hace falta una función del motor de cálculo (Fase 4).
        setPath(facts, action.resultPath, {
          pendingCalculation: action.function,
          args: action.args ?? {},
        });
        break;
    }
  }
}
