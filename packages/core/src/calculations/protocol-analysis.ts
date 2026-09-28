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

// Límites físicos amplios, no de ningún fabricante concreto: solo para
// detectar disparates evidentes (temperaturas imposibles, sección 25).
// El hold no pasa por aquí porque en muchos equipos baja de 0°C.
const MIN_PLAUSIBLE_TEMP = 0;
const MAX_PLAUSIBLE_TEMP = 110;

function checkPhase(phase: ProtocolPhase | undefined, path: string, issues: ValidationIssue[]): void {
  if (!phase) return;
  if (!Number.isFinite(phase.temperature) || phase.temperature < MIN_PLAUSIBLE_TEMP || phase.temperature > MAX_PLAUSIBLE_TEMP) {
    issues.push({
      code: 'INVALID_VALUE',
      message: `temperatura fuera de un rango físico plausible (${phase.temperature}°C)`,
      path,
    });
  }
  if (!Number.isFinite(phase.durationSeconds) || phase.durationSeconds < 0) {
    issues.push({ code: 'INVALID_VALUE', message: 'duración negativa o inválida', path });
  }
}

export function validateProtocol(protocol: Protocol): ValidationResult {
  const issues: ValidationIssue[] = [];

  checkPhase(protocol.initial, 'initial', issues);
  checkPhase(protocol.finalExtension, 'final_extension', issues);

  if (!protocol.cycles || !Number.isFinite(protocol.cycles.count) || protocol.cycles.count <= 0) {
    issues.push({ code: 'CYCLE_COUNT_TOO_LOW', message: 'el número de ciclos debe ser mayor que cero', path: 'cycles.count' });
  }

  if (!protocol.cycles?.steps || protocol.cycles.steps.length === 0) {
    issues.push({ code: 'MISSING_STEP', message: 'el protocolo no tiene ningún paso dentro del ciclo', path: 'cycles.steps' });
  } else {
    protocol.cycles.steps.forEach((step, index) => checkPhase(step, `cycles.steps[${index}]`, issues));
  }

  if (protocol.hold && !Number.isFinite(protocol.hold.temperature)) {
    issues.push({ code: 'INVALID_VALUE', message: 'temperatura de hold inválida', path: 'hold' });
  }

  return { valid: issues.length === 0, issues };
}

export function calculateTotalRuntime(protocol: Protocol): CalculationResult<number> {
  const validation = validateProtocol(protocol);
  if (!validation.valid) {
    return notCalculable(
      `no se puede calcular la duración de un protocolo inválido: ${validation.issues.map(i => i.message).join('; ')}`,
    );
  }

  const cycleDuration = protocol.cycles.steps.reduce((sum, step) => sum + step.durationSeconds, 0);
  const total =
    (protocol.initial?.durationSeconds ?? 0) +
    cycleDuration * protocol.cycles.count +
    (protocol.finalExtension?.durationSeconds ?? 0);
  // el hold se mantiene indefinidamente, no tiene una duración que sumar

  return calculated(total, {
    unit: 's',
    method: 'suma de: fase inicial + (pasos del ciclo × número de ciclos) + extensión final',
    confidence: 'high',
  });
}
