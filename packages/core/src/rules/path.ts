// Nada del otro mundo: leer/escribir "a.b.c" sobre un objeto. Se usa
// tanto en las condiciones (leer un hecho) como en las acciones
// (escribir el resultado de una regla). No hace falta traer lodash
// para esto.

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = target[key];
    if (typeof next !== 'object' || next === null) {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]] = value;
}
