import { Confidence } from '../types/common';

// Lo que hace una regla al cumplirse. "invoke" es un caso especial:
// el motor de reglas NO ejecuta cálculos, solo dice qué función habría
// que llamar (eso lo resuelve el motor de cálculo, Fase 4). Así una
// regla puede decir "aquí hace falta calcular la Tm" sin que el motor
// de reglas necesite saber cómo se calcula una Tm.
export type Action =
  | { op: 'set'; path: string; value: unknown }
  | { op: 'copy'; path: string; fromPath: string }
  | {
      op: 'derive'; // guarda un SourcedValue con origin: RULE_DERIVED
      path: string;
      value: unknown;
      unit?: string;
      method?: string;
      confidence?: Confidence;
      warnings?: string[];
    }
  | { op: 'flag'; path: string; status: string }
  | { op: 'invoke'; resultPath: string; function: string; args?: Record<string, unknown> };
