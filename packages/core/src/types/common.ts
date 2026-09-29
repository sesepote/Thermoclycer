// Tipos base usados por todas las entidades del motor de conocimiento.
//
// La idea central de todo el proyecto: un número por sí solo no dice nada.
// "60" puede ser una temperatura de annealing calculada, una recomendación
// de fabricante, o un valor sacado de un paper. Por eso casi ningún dato
// científico se guarda como número suelto: se guarda envuelto en
// SourcedValue, que obliga a decir de dónde viene.

export enum SourceType {
  CALCULATED = 'CALCULATED', // derivado matemáticamente (ej. Tm a partir de secuencia)
  REFERENCE = 'REFERENCE', // valor de un fabricante, ficha técnica, etc.
  EXPERIMENTAL = 'EXPERIMENTAL', // determinado empíricamente, no hay fórmula
  RULE_DERIVED = 'RULE_DERIVED', // salido de una regla del motor de reglas
  USER_DEFINED = 'USER_DEFINED', // introducido a mano por quien carga los datos
}

export type Confidence = 'high' | 'medium' | 'low';

// Referencia a de dónde sale un dato. No todo campo la necesita, pero
// cualquier valor científico "serio" debería poder señalar a una de estas.
export interface Source {
  id: string;
  kind: 'protocol' | 'manufacturer' | 'publication' | 'internal' | 'user';
  document?: string;
  publication?: string;
  manufacturer?: string;
  date?: string;
  version?: string;
  notas?: string;
}

// Un valor acompañado de su procedencia. Esto es lo que evita que el
// sistema "invente" datos: si no hay origen claro, el campo se deja
// vacío en vez de rellenarlo con un número que cuele.
export interface SourcedValue<T> {
  value: T;
  unit?: string;
  origin: SourceType;
  source?: Source;
  method?: string; // p.ej. "Wallace rule", "ficha técnica v2"
  confidence?: Confidence;
  warnings?: string[];
}
