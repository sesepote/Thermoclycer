import { Protocol, ProtocolCycles, ProtocolPhase, ProtocolStep, StepType } from '../knowledge/entities/protocol';

// Solo comprueba la FORMA del JSON (campos presentes y de tipo correcto);
// la plausibilidad científica es cosa de protocol-analysis/validator.
// Nunca rellena un campo ausente con un valor inventado: lo reporta.

export interface ParseError {
  path: string;
  message: string;
}

export type ParseResult = { ok: true; protocol: Protocol } | { ok: false; errors: ParseError[] };

type Dict = Record<string, unknown>;

const KNOWN_STEP_TYPES = new Set<string>(['denaturation', 'annealing', 'extension']);

const isRecord = (v: unknown): v is Dict => typeof v === 'object' && v !== null;

// Lee un campo numérico o registra el error correspondiente.
function readNumber(obj: Dict, key: string, path: string, errors: ParseError[], integer = false): number | undefined {
  const v = obj[key];
  if (typeof v === 'number' && (!integer || Number.isInteger(v))) return v;
  errors.push({ path: `${path}.${key}`, message: integer ? 'falta o no es un número entero' : 'falta o no es un número' });
  return undefined;
}

function parsePhase(value: unknown, path: string, errors: ParseError[]): ProtocolPhase | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push({ path, message: 'debería ser un objeto con temperature y duration_seconds' });
    return undefined;
  }
  const temperature = readNumber(value, 'temperature', path, errors);
  const durationSeconds = readNumber(value, 'duration_seconds', path, errors);
  return temperature !== undefined && durationSeconds !== undefined ? { temperature, durationSeconds } : undefined;
}

// Un tipo que no es de los tres clásicos no es un error (la spec pide no
// asumirlos): se guarda como 'custom' conservando el nombre en label.
function parseStep(value: unknown, path: string, errors: ParseError[]): ProtocolStep | undefined {
  if (!isRecord(value)) {
    errors.push({ path, message: 'debería ser un objeto con type, temperature y duration_seconds' });
    return undefined;
  }
  const phase = parsePhase(value, path, errors);
  if (!phase) return undefined;
  const raw = value.type;
  return typeof raw === 'string' && KNOWN_STEP_TYPES.has(raw)
    ? { type: raw as StepType, ...phase }
    : { type: 'custom', label: typeof raw === 'string' ? raw : undefined, ...phase };
}

function parseCycles(value: unknown, errors: ParseError[]): ProtocolCycles | undefined {
  if (!isRecord(value)) {
    errors.push({ path: 'cycles', message: 'falta o no es un objeto con count y steps' });
    return undefined;
  }
  const count = readNumber(value, 'count', 'cycles', errors, true);
  if (!Array.isArray(value.steps)) {
    errors.push({ path: 'cycles.steps', message: 'falta o no es un array' });
    return undefined;
  }
  const steps = value.steps.map((raw, i) => parseStep(raw, `cycles.steps[${i}]`, errors));
  return count !== undefined && steps.every(Boolean) ? { count, steps: steps as ProtocolStep[] } : undefined;
}

export function parseProtocolJson(raw: unknown, id: string): ParseResult {
  if (!isRecord(raw)) return { ok: false, errors: [{ path: '', message: 'el protocolo no es un objeto JSON' }] };

  const errors: ParseError[] = [];
  const initial = parsePhase(raw.initial, 'initial', errors);
  const cycles = parseCycles(raw.cycles, errors);
  const finalExtension = parsePhase(raw.final_extension, 'final_extension', errors);
  const holdTemp = isRecord(raw.hold) ? readNumber(raw.hold, 'temperature', 'hold', errors) : undefined;
  if (raw.hold !== undefined && !isRecord(raw.hold)) {
    errors.push({ path: 'hold.temperature', message: 'falta o no es un número' });
  }

  if (errors.length > 0 || !cycles) return { ok: false, errors };
  const hold = holdTemp !== undefined ? { temperature: holdTemp } : undefined;
  return { ok: true, protocol: { id, initial, cycles, finalExtension, hold } };
}
