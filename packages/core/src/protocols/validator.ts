import { Protocol, ProtocolCycles, ProtocolPhase, ProtocolStep } from '../knowledge/entities/protocol';
import {
  DEFAULT_TOLERANCE,
  ErrorType,
  ParameterComparison,
  ParameterStatus,
  ProtocolTolerance,
  StepTolerance,
} from './types';

// Este módulo no calcula ninguna nota ni decide si el ejercicio está
// "aprobado": eso es trabajo del evaluador (Fase 7), que pondera estas
// comparaciones según sus propios pesos. Aquí solo se compara, campo a
// campo, un protocolo candidato contra uno esperado, y se dice qué
// pasó con cada uno usando el vocabulario de las secciones 11 y 15.

function classify(
  diff: number,
  tolerance: number | undefined,
  highType: ErrorType,
  lowType: ErrorType,
): { status: ParameterStatus; errorType?: ErrorType } {
  if (diff === 0) return { status: 'EXACT' };
  const tol = tolerance ?? 0;
  if (Math.abs(diff) <= tol) return { status: 'ACCEPTED_RANGE' };
  return { status: 'OUT_OF_RANGE', errorType: diff > 0 ? highType : lowType };
}

function comparePhase(
  name: string,
  expected: ProtocolPhase | undefined,
  candidate: ProtocolPhase | undefined,
  tolerance: StepTolerance | undefined,
  out: ParameterComparison[],
): void {
  if (expected === undefined && candidate === undefined) return;

  if (expected === undefined && candidate !== undefined) {
    out.push({
      name,
      status: 'INVALID',
      errorType: 'EXTRA_STEP',
      message: `se incluyó "${name}" pero el protocolo de referencia no la contempla`,
    });
    return;
  }

  if (expected !== undefined && candidate === undefined) {
    out.push({ name, status: 'MISSING', errorType: 'MISSING_STEP', message: `falta la fase "${name}"` });
    return;
  }

  const e = expected as ProtocolPhase;
  const c = candidate as ProtocolPhase;

  const temp = classify(c.temperature - e.temperature, tolerance?.temperatureToleranceC, 'TEMPERATURE_TOO_HIGH', 'TEMPERATURE_TOO_LOW');
  out.push({
    name: `${name}.temperature`,
    status: temp.status,
    userValue: c.temperature,
    expectedValue: e.temperature,
    expectedRange: tolerance?.temperatureToleranceC
      ? { min: e.temperature - tolerance.temperatureToleranceC, max: e.temperature + tolerance.temperatureToleranceC }
      : undefined,
    errorType: temp.errorType,
    message:
      temp.status === 'EXACT'
        ? `${name}: temperatura correcta (${c.temperature}°C)`
        : temp.status === 'ACCEPTED_RANGE'
          ? `${name}: temperatura aceptable (${c.temperature}°C, referencia ${e.temperature}°C)`
          : `${name}: temperatura fuera de rango (${c.temperature}°C, se esperaba ${e.temperature}°C)`,
  });

  const dur = classify(c.durationSeconds - e.durationSeconds, tolerance?.durationToleranceSeconds, 'TIME_TOO_LONG', 'TIME_TOO_SHORT');
  out.push({
    name: `${name}.durationSeconds`,
    status: dur.status,
    userValue: c.durationSeconds,
    expectedValue: e.durationSeconds,
    expectedRange: tolerance?.durationToleranceSeconds
      ? { min: e.durationSeconds - tolerance.durationToleranceSeconds, max: e.durationSeconds + tolerance.durationToleranceSeconds }
      : undefined,
    errorType: dur.errorType,
    message:
      dur.status === 'EXACT'
        ? `${name}: duración correcta (${c.durationSeconds}s)`
        : dur.status === 'ACCEPTED_RANGE'
          ? `${name}: duración aceptable (${c.durationSeconds}s, referencia ${e.durationSeconds}s)`
          : `${name}: duración fuera de rango (${c.durationSeconds}s, se esperaban ${e.durationSeconds}s)`,
  });
}

function compareCycleCount(expected: ProtocolCycles, candidate: ProtocolCycles, out: ParameterComparison[]): void {
  // La spec es explícita (sección 11): el número de ciclos no suele
  // admitir tolerancia, a diferencia de una temperatura.
  const result = classify(candidate.count - expected.count, 0, 'CYCLE_COUNT_TOO_HIGH', 'CYCLE_COUNT_TOO_LOW');
  out.push({
    name: 'cycles.count',
    status: result.status,
    userValue: candidate.count,
    expectedValue: expected.count,
    errorType: result.errorType,
    message:
      result.status === 'EXACT'
        ? `número de ciclos correcto (${candidate.count})`
        : `número de ciclos incorrecto: ${candidate.count} (se esperaban ${expected.count})`,
  });
}

function stepTypesEqual(a: ProtocolStep, b: ProtocolStep): boolean {
  if (a.type !== b.type) return false;
  return a.type === 'custom' ? a.label === b.label : true;
}

function stepKey(s: ProtocolStep): string {
  return s.type === 'custom' ? `custom:${s.label ?? ''}` : s.type;
}

function isSameTypeMultiset(a: ProtocolStep[], b: ProtocolStep[]): boolean {
  const countsA = new Map<string, number>();
  for (const s of a) countsA.set(stepKey(s), (countsA.get(stepKey(s)) ?? 0) + 1);
  const countsB = new Map<string, number>();
  for (const s of b) countsB.set(stepKey(s), (countsB.get(stepKey(s)) ?? 0) + 1);
  if (countsA.size !== countsB.size) return false;
  for (const [key, count] of countsA) if (countsB.get(key) !== count) return false;
  return true;
}

function compareSteps(
  expected: ProtocolStep[],
  candidate: ProtocolStep[],
  tolerance: StepTolerance | undefined,
  out: ParameterComparison[],
): void {
  const sameLength = expected.length === candidate.length;
  const inSameOrder = sameLength && expected.every((step, i) => stepTypesEqual(step, candidate[i]));

  if (sameLength && !inSameOrder && isSameTypeMultiset(expected, candidate)) {
    out.push({
      name: 'cycles.steps',
      status: 'INVALID',
      errorType: 'WRONG_ORDER',
      message: 'los pasos del ciclo están todos presentes pero en un orden distinto al esperado',
    });
    return;
  }

  const minLength = Math.min(expected.length, candidate.length);
  for (let i = 0; i < minLength; i++) {
    const e = expected[i];
    const c = candidate[i];
    if (!stepTypesEqual(e, c)) {
      out.push({
        name: `cycles.steps[${i}]`,
        status: 'INVALID',
        errorType: 'INCOMPATIBLE_PARAMETER',
        message: `en la posición ${i} se esperaba un paso de tipo "${e.type}" y hay uno de tipo "${c.type}"`,
      });
      continue;
    }
    comparePhase(`cycles.steps[${i}]`, e, c, tolerance, out);
  }

  for (let i = minLength; i < expected.length; i++) {
    out.push({
      name: `cycles.steps[${i}]`,
      status: 'MISSING',
      errorType: 'MISSING_STEP',
      message: `falta el paso ${i} del ciclo (tipo esperado: "${expected[i].type}")`,
    });
  }
  for (let i = minLength; i < candidate.length; i++) {
    out.push({
      name: `cycles.steps[${i}]`,
      status: 'INVALID',
      errorType: 'EXTRA_STEP',
      message: `hay un paso de más en la posición ${i} que el protocolo de referencia no contempla`,
    });
  }
}

function compareHold(
  expected: { temperature: number } | undefined,
  candidate: { temperature: number } | undefined,
  out: ParameterComparison[],
): void {
  if (expected === undefined && candidate === undefined) return;

  if (expected === undefined && candidate !== undefined) {
    out.push({ name: 'hold', status: 'NOT_APPLICABLE', message: 'se incluyó un hold que el protocolo de referencia no define' });
    return;
  }
  if (expected !== undefined && candidate === undefined) {
    out.push({ name: 'hold', status: 'MISSING', errorType: 'MISSING_STEP', message: 'falta la fase de hold' });
    return;
  }

  const e = expected as { temperature: number };
  const c = candidate as { temperature: number };
  // El hold es la fase menos crítica: casi cualquier temperatura de
  // conservación razonable vale, así que una diferencia se informa
  // pero no se marca como fuera de rango.
  const status: ParameterStatus = e.temperature === c.temperature ? 'EXACT' : 'ACCEPTED_RANGE';
  out.push({
    name: 'hold.temperature',
    status,
    userValue: c.temperature,
    expectedValue: e.temperature,
    message:
      status === 'EXACT'
        ? `hold correcto (${c.temperature}°C)`
        : `hold en ${c.temperature}°C (referencia ${e.temperature}°C, no suele ser crítico)`,
  });
}

export function compareProtocols(
  expected: Protocol,
  candidate: Protocol,
  tolerance: ProtocolTolerance = DEFAULT_TOLERANCE,
): ParameterComparison[] {
  const out: ParameterComparison[] = [];
  comparePhase('initial', expected.initial, candidate.initial, tolerance.initial, out);
  compareCycleCount(expected.cycles, candidate.cycles, out);
  compareSteps(expected.cycles.steps, candidate.cycles.steps, tolerance.cycleSteps, out);
  comparePhase('final_extension', expected.finalExtension, candidate.finalExtension, tolerance.finalExtension, out);
  compareHold(expected.hold, candidate.hold, out);
  return out;
}
