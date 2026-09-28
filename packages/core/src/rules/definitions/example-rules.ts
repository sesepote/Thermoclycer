import { Rule } from '../../knowledge/entities/rule';

// Las tres reglas de ejemplo de la sección 7, llevadas a algo ejecutable.
// Están atadas a los ids del demo de seed-data.ts a propósito: son
// reglas de ejemplo, no la base de reglas real del sistema.

// "IF polymerase == X THEN compatible_buffers = [...]"
export const bufferCompatibilityRule: Rule = {
  id: 'rule-buffer-compat-taq',
  nombre: 'Buffers compatibles con Taq genérica (demo)',
  descripcion: 'Si la polimerasa es la Taq demo, sus buffers compatibles son los declarados en el catálogo.',
  prioridad: 10,
  activa: true,
  version: '0.1.0',
  fuente: 'spec sección 7, ejemplo 1',
  condiciones: { op: 'eq', path: 'polymerase.id', value: 'poly-taq-demo' },
  accion: {
    op: 'derive',
    path: 'compatibleBuffers',
    value: ['buffer-standard-demo'],
    method: 'catálogo de compatibilidad declarado en la polimerasa',
    confidence: 'high',
  },
};

// "IF primer_pair == compatible_pair THEN calculate_or_lookup_annealing_constraints()"
export const annealingConstraintsRule: Rule = {
  id: 'rule-annealing-constraints',
  nombre: 'Calcular restricciones de annealing para un par de primers compatible',
  descripcion: 'Si el par de primers es compatible entre sí, hace falta calcular/consultar sus restricciones de annealing.',
  prioridad: 5,
  activa: true,
  version: '0.1.0',
  fuente: 'spec sección 7, ejemplo 2',
  condiciones: { op: 'eq', path: 'primerPair.compatible', value: true },
  accion: {
    op: 'invoke',
    resultPath: 'annealingConstraints',
    function: 'calculateAnnealingConstraints',
    args: { primerForward: 'primerPair.forward', primerReverse: 'primerPair.reverse' },
  },
};

// "IF user_temperature >= minimum AND user_temperature <= maximum THEN parameter_status = ACCEPTED"
export const annealingTemperatureAcceptedRule: Rule = {
  id: 'rule-annealing-temp-accepted',
  nombre: 'Temperatura de annealing dentro del rango aceptado',
  descripcion: 'Si la temperatura de annealing introducida cae dentro del rango esperado, se acepta el parámetro.',
  prioridad: 1,
  activa: true,
  version: '0.1.0',
  fuente: 'spec sección 7, ejemplo 3 / sección 11',
  condiciones: {
    op: 'and',
    conditions: [
      { op: 'gte', path: 'userInput.annealingTemperature', value: { ref: 'expectedRange.min' } },
      { op: 'lte', path: 'userInput.annealingTemperature', value: { ref: 'expectedRange.max' } },
    ],
  },
  accion: { op: 'flag', path: 'evaluation.annealingTemperature.status', status: 'ACCEPTED' },
};

export const exampleRules: Rule[] = [
  bufferCompatibilityRule,
  annealingConstraintsRule,
  annealingTemperatureAcceptedRule,
];
