// Punto de entrada del paquete. Todo lo que use packages/web (o
// cualquier otro consumidor futuro: una CLI, otra UI...) debería poder
// importarlo desde aquí, sin tener que conocer la estructura interna
// de carpetas.

export * from './types/common';

export * from './knowledge/entities/primer';
export * from './knowledge/entities/polymerase';
export * from './knowledge/entities/buffer';
export * from './knowledge/entities/chemistry';
export * from './knowledge/entities/assay';
export * from './knowledge/entities/protocol';
export * from './knowledge/entities/rule';
export * from './knowledge/relationships';
export { KnowledgeBase } from './knowledge/knowledge-base';
export { buildDemoKnowledgeBase } from './knowledge/seed-data';

export * from './rules/condition';
export * from './rules/action';
export { RuleEngine } from './rules/engine';
export type { RuleEngineResult, RuleTraceEntry } from './rules/engine';
export * from './rules/definitions/example-rules';

export * from './calculations/types';
export { calculateLength, calculateGcContent } from './calculations/primer-analysis';
export { calculateTm, calculateAnnealingTemperatureRange } from './calculations/thermodynamics';
export type { AnnealingRange } from './calculations/thermodynamics';
export { validateProtocol, calculateTotalRuntime } from './calculations/protocol-analysis';
export type { ValidationIssue, ValidationResult } from './calculations/protocol-analysis';
export { CalculationResolver } from './calculations/resolver';
export { buildDefaultCalculationResolver } from './calculations/default-registry';

export { parseProtocolJson } from './protocols/parser';
export type { ParseError, ParseResult } from './protocols/parser';
export { compareProtocols } from './protocols/validator';
export * from './protocols/types';

export { SimulationController } from './simulation/state-machine';
export type { SimulationSpeed } from './simulation/state-machine';
export { resolveTiming } from './simulation/timing';
export type { TimingResult } from './simulation/timing';
export * from './simulation/types';
