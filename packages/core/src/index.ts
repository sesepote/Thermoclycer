// API pública del paquete: cualquier consumidor (la web, una CLI...)
// importa desde aquí sin conocer la estructura interna de carpetas.

export * from './types/common';

/* ---------- Conocimiento ---------- */
export * from './knowledge/entities/primer';
export * from './knowledge/entities/polymerase';
export * from './knowledge/entities/buffer';
export * from './knowledge/entities/chemistry';
export * from './knowledge/entities/assay';
export * from './knowledge/entities/protocol';
export * from './knowledge/entities/rule';
export * from './knowledge/relationships';
export * from './knowledge/knowledge-base';
export * from './knowledge/seed-data';

/* ---------- Reglas ---------- */
export * from './rules/condition';
export * from './rules/action';
export * from './rules/engine';
export * from './rules/definitions/example-rules';

/* ---------- Cálculo ---------- */
export * from './calculations/types';
export * from './calculations/primer-analysis';
export * from './calculations/thermodynamics';
export * from './calculations/protocol-analysis';
export * from './calculations/resolver';
export * from './calculations/default-registry';

/* ---------- Protocolos ---------- */
export * from './protocols/types';
export * from './protocols/parser';
export * from './protocols/validator';

/* ---------- Simulación ---------- */
export * from './simulation/types';
export * from './simulation/timing';
export * from './simulation/state-machine';
