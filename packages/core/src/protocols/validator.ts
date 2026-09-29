import { Protocol, ProtocolPhase, ProtocolStep } from '../knowledge/entities/protocol';
import { DEFAULT_TOLERANCE, ErrorType, ParameterComparison, ParameterStatus, ProtocolTolerance, StepTolerance } from './types';

// Compara campo a campo un protocolo candidato con uno esperado usando
// el vocabulario de las secciones 11 y 15. No pone nota: ponderar estas
// comparaciones es trabajo del evaluador (Fase 7).

type Out = ParameterComparison[];

/* ---------- Comparación numérica genérica ---------- */

interface FieldSpec {
  what: 'temperatura' | 'duración';
  unit: string;
  errors: [high: ErrorType, low: ErrorType];
}

const TEMPERATURE: FieldSpec = { what: 'temperatura', unit: '°C', errors: ['TEMPERATURE_TOO_HIGH', 'TEMPERATURE_TOO_LOW'] };
const DURATION: FieldSpec = { what: 'duración', unit: 's', errors: ['TIME_TOO_LONG', 'TIME_TOO_SHORT'] };

function classify(diff: number, tolerance = 0, [high, low]: [ErrorType, ErrorType]) {
  if (diff === 0) return { status: 'EXACT' as ParameterStatus };
  if (Math.abs(diff) <= tolerance) return { status: 'ACCEPTED_RANGE' as ParameterStatus };
  return { status: 'OUT_OF_RANGE' as ParameterStatus, errorType: diff > 0 ? high : low };
}

function compareField(out: Out, phase: string, key: string, user: number, expected: number, tol: number | undefined, spec: FieldSpec) {
  const { status, errorType } = classify(user - expected, tol, spec.errors);
  const u = `${user}${spec.unit}`;
  const e = `${expected}${spec.unit}`;
  const message = {
    EXACT: `${phase}: ${spec.what} correcta (${u})`,
    ACCEPTED_RANGE: `${phase}: ${spec.what} aceptable (${u}, referencia ${e})`,
    OUT_OF_RANGE: `${phase}: ${spec.what} fuera de rango (${u}, se esperaba ${e})`,
  }[status as 'EXACT' | 'ACCEPTED_RANGE' | 'OUT_OF_RANGE'];

  out.push({
    name: `${phase}.${key}`,
    status,
    errorType,
    userValue: user,
    expectedValue: expected,
    expectedRange: tol ? { min: expected - tol, max: expected + tol } : undefined,
    message,
  });
}

/* ---------- Fases (inicial, pasos del ciclo, extensión final) ---------- */

function comparePhase(out: Out, name: string, e: ProtocolPhase | undefined, c: ProtocolPhase | undefined, tol?: StepTolerance) {
  if (!e && !c) return;
  if (!e) {
    out.push({ name, status: 'INVALID', errorType: 'EXTRA_STEP', message: `se incluyó "${name}" pero el protocolo de referencia no la contempla` });
    return;
  }
  if (!c) {
    out.push({ name, status: 'MISSING', errorType: 'MISSING_STEP', message: `falta la fase "${name}"` });
    return;
  }
  compareField(out, name, 'temperature', c.temperature, e.temperature, tol?.temperatureToleranceC, TEMPERATURE);
  compareField(out, name, 'durationSeconds', c.durationSeconds, e.durationSeconds, tol?.durationToleranceSeconds, DURATION);
}

/* ---------- Pasos del ciclo ---------- */

const stepKey = (s: ProtocolStep) => (s.type === 'custom' ? `custom:${s.label ?? ''}` : s.type);

// ¿Mismos tipos de paso con las mismas repeticiones, sin importar el orden?
function sameTypeMultiset(a: ProtocolStep[], b: ProtocolStep[]): boolean {
  const counts = new Map<string, number>();
  for (const s of a) counts.set(stepKey(s), (counts.get(stepKey(s)) ?? 0) + 1);
  for (const s of b) counts.set(stepKey(s), (counts.get(stepKey(s)) ?? 0) - 1);
  return [...counts.values()].every(n => n === 0);
}

function compareSteps(out: Out, expected: ProtocolStep[], candidate: ProtocolStep[], tol?: StepTolerance) {
  const sameLength = expected.length === candidate.length;
  const sameOrder = sameLength && expected.every((s, i) => stepKey(s) === stepKey(candidate[i]));

  if (sameLength && !sameOrder && sameTypeMultiset(expected, candidate)) {
    out.push({ name: 'cycles.steps', status: 'INVALID', errorType: 'WRONG_ORDER', message: 'los pasos del ciclo están todos presentes pero en un orden distinto al esperado' });
    return;
  }

  const longest = Math.max(expected.length, candidate.length);
  for (let i = 0; i < longest; i++) {
    const name = `cycles.steps[${i}]`;
    const e = expected[i];
    const c = candidate[i];
    if (!c) {
      out.push({ name, status: 'MISSING', errorType: 'MISSING_STEP', message: `falta el paso ${i} del ciclo (tipo esperado: "${e.type}")` });
    } else if (!e) {
      out.push({ name, status: 'INVALID', errorType: 'EXTRA_STEP', message: `hay un paso de más en la posición ${i} que el protocolo de referencia no contempla` });
    } else if (stepKey(e) !== stepKey(c)) {
      out.push({ name, status: 'INVALID', errorType: 'INCOMPATIBLE_PARAMETER', message: `en la posición ${i} se esperaba un paso de tipo "${e.type}" y hay uno de tipo "${c.type}"` });
    } else {
      comparePhase(out, name, e, c, tol);
    }
  }
}

/* ---------- Hold (fase menos crítica: una diferencia se informa pero no penaliza) ---------- */

function compareHold(out: Out, e?: { temperature: number }, c?: { temperature: number }) {
  if (!e && !c) return;
  if (!e) return void out.push({ name: 'hold', status: 'NOT_APPLICABLE', message: 'se incluyó un hold que el protocolo de referencia no define' });
  if (!c) return void out.push({ name: 'hold', status: 'MISSING', errorType: 'MISSING_STEP', message: 'falta la fase de hold' });
  const exact = e.temperature === c.temperature;
  out.push({
    name: 'hold.temperature',
    status: exact ? 'EXACT' : 'ACCEPTED_RANGE',
    userValue: c.temperature,
    expectedValue: e.temperature,
    message: exact ? `hold correcto (${c.temperature}°C)` : `hold en ${c.temperature}°C (referencia ${e.temperature}°C, no suele ser crítico)`,
  });
}

/* ---------- Punto de entrada ---------- */

export function compareProtocols(expected: Protocol, candidate: Protocol, tolerance: ProtocolTolerance = DEFAULT_TOLERANCE): ParameterComparison[] {
  const out: Out = [];
  comparePhase(out, 'initial', expected.initial, candidate.initial, tolerance.initial);

  // El número de ciclos no admite tolerancia (sección 11).
  const count = classify(candidate.cycles.count - expected.cycles.count, 0, ['CYCLE_COUNT_TOO_HIGH', 'CYCLE_COUNT_TOO_LOW']);
  out.push({
    name: 'cycles.count',
    ...count,
    userValue: candidate.cycles.count,
    expectedValue: expected.cycles.count,
    message:
      count.status === 'EXACT'
        ? `número de ciclos correcto (${candidate.cycles.count})`
        : `número de ciclos incorrecto: ${candidate.cycles.count} (se esperaban ${expected.cycles.count})`,
  });

  compareSteps(out, expected.cycles.steps, candidate.cycles.steps, tolerance.cycleSteps);
  comparePhase(out, 'final_extension', expected.finalExtension, candidate.finalExtension, tolerance.finalExtension);
  compareHold(out, expected.hold, candidate.hold);
  return out;
}
