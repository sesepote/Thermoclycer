import { Protocol } from '../knowledge/entities/protocol';
import { cycleDuration } from '../calculations/protocol-analysis';
import { SimulationPhase } from './types';

// Función pura: dado un instante del protocolo, dice en qué fase, ciclo
// y paso está. Quien la usa decide cómo avanza el tiempo (real o
// acelerado), así que esto no sabe nada de relojes.

export interface TimingResult {
  phase: SimulationPhase;
  cycleNumber?: number;
  stepIndex?: number;
  targetTemperature: number;
  remainingInPhaseSeconds: number;
  progressFraction: number;
}

export function resolveTiming(protocol: Protocol, elapsedSeconds: number, totalSeconds: number): TimingResult {
  const progressFraction = totalSeconds > 0 ? Math.min(1, Math.max(0, elapsedSeconds / totalSeconds)) : 1;
  const { initial, cycles, finalExtension, hold } = protocol;
  let t = elapsedSeconds;

  /* ---------- Desnaturalización inicial ---------- */
  if (initial) {
    if (t < initial.durationSeconds) {
      return { phase: 'initial', targetTemperature: initial.temperature, remainingInPhaseSeconds: initial.durationSeconds - t, progressFraction };
    }
    t -= initial.durationSeconds;
  }

  /* ---------- Ciclado: ciclo por división entera, paso recorriendo solo un ciclo ---------- */
  const perCycle = cycleDuration(protocol);
  const cyclesTime = perCycle * cycles.count;
  if (perCycle > 0 && t < cyclesTime) {
    let tInCycle = t % perCycle;
    for (let i = 0; i < cycles.steps.length; i++) {
      const step = cycles.steps[i];
      if (tInCycle < step.durationSeconds) {
        return {
          phase: 'cycle',
          cycleNumber: Math.floor(t / perCycle) + 1,
          stepIndex: i,
          targetTemperature: step.temperature,
          remainingInPhaseSeconds: step.durationSeconds - tInCycle,
          progressFraction,
        };
      }
      tInCycle -= step.durationSeconds;
    }
  }
  t -= cyclesTime;

  /* ---------- Extensión final ---------- */
  if (finalExtension && t < finalExtension.durationSeconds) {
    return {
      phase: 'final_extension',
      targetTemperature: finalExtension.temperature,
      remainingInPhaseSeconds: finalExtension.durationSeconds - t,
      progressFraction,
    };
  }

  /* ---------- Hold indefinido o fin ---------- */
  if (hold) return { phase: 'hold', targetTemperature: hold.temperature, remainingInPhaseSeconds: Infinity, progressFraction: 1 };
  return { phase: 'completed', targetTemperature: 0, remainingInPhaseSeconds: 0, progressFraction: 1 };
}
