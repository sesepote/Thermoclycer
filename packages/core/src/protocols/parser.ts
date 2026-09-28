import { Protocol, ProtocolCycles, ProtocolPhase, ProtocolStep, StepType } from '../knowledge/entities/protocol';

// Este módulo NO decide si un protocolo tiene sentido científico (eso
// es cosa de calculations/protocol-analysis.ts y de este mismo módulo
// en validator.ts). Aquí solo se comprueba que el JSON tiene la forma
// correcta: campos presentes, tipos correctos. Nunca se rellena un
// campo que falta con un valor por defecto inventado; si falta algo,
// se reporta como error.

export interface ParseError {
  path: string;
  message: string;
}

export type ParseResult =
  | { ok: true; protocol: Protocol }
  | { ok: false; errors: ParseError[] };

const KNOWN_STEP_TYPES: StepType[] = ['denaturation', 'annealing', 'extension'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePhase(value: unknown, path: string, errors: ParseError[]): ProtocolPhase | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push({ path, message: 'debería ser un objeto con temperature y duration_seconds' });
    return undefined;
  }
  const temperature = value.temperature;
  const duration = value.duration_seconds;
  if (typeof temperature !== 'number') {
    errors.push({ path: `${path}.temperature`, message: 'falta o no es un número' });
  }
  if (typeof duration !== 'number') {
    errors.push({ path: `${path}.duration_seconds`, message: 'falta o no es un número' });
  }
  if (typeof temperature !== 'number' || typeof duration !== 'number') return undefined;

  return { temperature, durationSeconds: duration };
}

function parseStepType(raw: unknown): { type: StepType; label?: string } {
  if (typeof raw === 'string' && (KNOWN_STEP_TYPES as string[]).includes(raw)) {
    return { type: raw as StepType };
  }
  // Un tipo de paso que no es de los tres clásicos no es un error: la
  // spec pide explícitamente no asumir que todo protocolo tiene solo
  // denaturation/annealing/extension. Se guarda como 'custom' con el
  // nombre original en label, para no perder esa información.
  return { type: 'custom', label: typeof raw === 'string' ? raw : undefined };
}

function parseStep(value: unknown, path: string, errors: ParseError[]): ProtocolStep | undefined {
  if (!isRecord(value)) {
    errors.push({ path, message: 'debería ser un objeto con type, temperature y duration_seconds' });
    return undefined;
  }
  const { type, label } = parseStepType(value.type);
  const temperature = value.temperature;
  const duration = value.duration_seconds;

  if (typeof temperature !== 'number') errors.push({ path: `${path}.temperature`, message: 'falta o no es un número' });
  if (typeof duration !== 'number') errors.push({ path: `${path}.duration_seconds`, message: 'falta o no es un número' });
  if (typeof temperature !== 'number' || typeof duration !== 'number') return undefined;

  return { type, label, temperature, durationSeconds: duration };
}

function parseCycles(value: unknown, errors: ParseError[]): ProtocolCycles | undefined {
  if (!isRecord(value)) {
    errors.push({ path: 'cycles', message: 'falta o no es un objeto con count y steps' });
    return undefined;
  }
  const count = value.count;
  if (typeof count !== 'number' || !Number.isInteger(count)) {
    errors.push({ path: 'cycles.count', message: 'falta o no es un número entero' });
  }
  if (!Array.isArray(value.steps)) {
    errors.push({ path: 'cycles.steps', message: 'falta o no es un array' });
    return undefined;
  }

  const steps: ProtocolStep[] = [];
  value.steps.forEach((raw, index) => {
    const step = parseStep(raw, `cycles.steps[${index}]`, errors);
    if (step) steps.push(step);
  });

  if (typeof count !== 'number' || !Number.isInteger(count) || steps.length !== value.steps.length) {
    return undefined;
  }

  return { count, steps };
}

function parseHold(value: unknown, errors: ParseError[]): { temperature: number } | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.temperature !== 'number') {
    errors.push({ path: 'hold.temperature', message: 'falta o no es un número' });
    return undefined;
  }
  return { temperature: value.temperature };
}

export function parseProtocolJson(raw: unknown, id: string): ParseResult {
  const errors: ParseError[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: [{ path: '', message: 'el protocolo no es un objeto JSON' }] };
  }

  const initial = parsePhase(raw.initial, 'initial', errors);
  const cycles = parseCycles(raw.cycles, errors);
  const finalExtension = parsePhase(raw.final_extension, 'final_extension', errors);
  const hold = parseHold(raw.hold, errors);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    protocol: { id, initial, cycles: cycles as ProtocolCycles, finalExtension, hold },
  };
}
