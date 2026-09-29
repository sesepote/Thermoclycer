// Lectura/escritura de rutas "a.b.c" sobre un objeto, usadas por
// condiciones (leer un hecho) y acciones (escribir un resultado).

type Dict = Record<string, unknown>;

export function getPath(obj: unknown, path: string): unknown {
  let acc = obj;
  for (const key of path.split('.')) {
    if (acc === null || typeof acc !== 'object' || !(key in acc)) return undefined;
    acc = (acc as Dict)[key];
  }
  return acc;
}

// Crea los objetos intermedios que falten.
export function setPath(obj: Dict, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  let target = obj;
  for (const key of keys) {
    if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
    target = target[key] as Dict;
  }
  target[last] = value;
}
