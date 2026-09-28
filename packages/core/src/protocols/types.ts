// Vocabulario tomado literalmente de la spec: la sección 11 define los
// estados posibles de un parámetro, la sección 15 los tipos de error
// concretos. Este módulo no inventa categorías nuevas.

export type ParameterStatus =
  | 'EXACT'
  | 'ACCEPTED_RANGE'
  | 'OUT_OF_RANGE'
  | 'INVALID'
  | 'MISSING'
  | 'NOT_APPLICABLE';

export type ErrorType =
  | 'TEMPERATURE_TOO_HIGH'
  | 'TEMPERATURE_TOO_LOW'
  | 'TIME_TOO_SHORT'
  | 'TIME_TOO_LONG'
  | 'CYCLE_COUNT_TOO_LOW'
  | 'CYCLE_COUNT_TOO_HIGH'
  | 'MISSING_STEP'
  | 'EXTRA_STEP'
  | 'WRONG_ORDER'
  | 'INCOMPATIBLE_PARAMETER'
  | 'INVALID_VALUE';

export interface ParameterComparison {
  name: string; // ruta del parámetro, ej. "cycles.steps[1].temperature"
  status: ParameterStatus;
  userValue?: number;
  expectedValue?: number;
  expectedRange?: { min: number; max: number };
  errorType?: ErrorType;
  message: string;
}

// Tolerancia permitida por campo. undefined o 0 significa "coincidencia
// exacta requerida" (como el número de ciclos en el ejemplo de la
// sección 11: "number_of_cycles = 35" no admite rango).
export interface StepTolerance {
  temperatureToleranceC?: number;
  durationToleranceSeconds?: number;
}

export interface ProtocolTolerance {
  initial?: StepTolerance;
  cycleSteps?: StepTolerance;
  finalExtension?: StepTolerance;
}

export const DEFAULT_TOLERANCE: ProtocolTolerance = {
  initial: { temperatureToleranceC: 1, durationToleranceSeconds: 15 },
  cycleSteps: { temperatureToleranceC: 2, durationToleranceSeconds: 10 },
  finalExtension: { temperatureToleranceC: 1, durationToleranceSeconds: 30 },
};
