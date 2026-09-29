import { Protocol, ProtocolPhase } from '../knowledge/entities/protocol';
import { CalculationResult, calculated, notCalculable } from './types';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// Límites físicos amplios, no de ningún fabricante: solo detectan
// disparates evidentes (sección 25). El hold no pasa por aquí porque en
// muchos equipos baja de 0 °C.
const MIN_PLAUSIBLE_TEMP = 0;
const MAX_PLAUSIBLE_TEMP = 110;

/* ---------- Duraciones (sin validar: las usa también la simulación en caliente) ---------- */

export const cycleDuration = (p: Protocol): number => p.cycles.steps.reduce((sum, s) => sum + s.durationSeconds, 0);

// Duración total sin el hold, que se mantiene indefinidamente.
export const protocolDuration = (p: Protocol): number =>
  (p.initial?.durationSeconds ?? 0) + cycleDuration(p) * p.cycles.count + (p.finalExtension?.durationSeconds ?? 0);

/* ---------- Validación de plausibilidad ---------- */

function checkPhase(phase: ProtocolPhase | undefined, path: string, issues: ValidationIssue[]): void {
  if (!phase) return;
  const { temperature: t, durationSeconds: d } = phase;
  if (!Number.isFinite(t) || t < MIN_PLAUSIBLE_TEMP || t > MAX_PLAUSIBLE_TEMP) {
    issues.push({ code: 'INVALID_VALUE', message: `temperatura fuera de un rango físico plausible (${t}°C)`, path });
  }
  if (!Number.isFinite(d) || d < 0) {
    issues.push({ code: 'INVALID_VALUE', message: 'duración negativa o inválida', path });
  }
}

export function validateProtocol(protocol: Protocol): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { cycles } = protocol;

  checkPhase(protocol.initial, 'initial', issues);
  checkPhase(protocol.finalExtension, 'final_extension', issues);

  if (!cycles || !Number.isFinite(cycles.count) || cycles.count <= 0) {
    issues.push({ code: 'CYCLE_COUNT_TOO_LOW', message: 'el número de ciclos debe ser mayor que cero', path: 'cycles.count' });
  }
  if (!cycles?.steps?.length) {
    issues.push({ code: 'MISSING_STEP', message: 'el protocolo no tiene ningún paso dentro del ciclo', path: 'cycles.steps' });
  } else {
    cycles.steps.forEach((step, i) => checkPhase(step, `cycles.steps[${i}]`, issues));
  }
  if (protocol.hold && !Number.isFinite(protocol.hold.temperature)) {
    issues.push({ code: 'INVALID_VALUE', message: 'temperatura de hold inválida', path: 'hold' });
  }

  return { valid: issues.length === 0, issues };
}

export function calculateTotalRuntime(protocol: Protocol): CalculationResult<number> {
  const { valid, issues } = validateProtocol(protocol);
  if (!valid) {
    return notCalculable(`no se puede calcular la duración de un protocolo inválido: ${issues.map(i => i.message).join('; ')}`);
  }
  return calculated(protocolDuration(protocol), {
    unit: 's',
    method: 'suma de: fase inicial + (pasos del ciclo × número de ciclos) + extensión final',
    confidence: 'high',
  });
}
