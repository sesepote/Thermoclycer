import { Protocol } from '../knowledge/entities/protocol';
import { SimulationPhase } from './types';

// Función pura a propósito: no lleva reloj propio ni efectos. Quien la
// use (la UI, normalmente) decide cómo avanza "elapsedSeconds" —así
// puede ir en tiempo real, o acelerado 100x, sin que este cálculo
// tenga que saber nada de eso.

export interface TimingResult {
  phase: SimulationPhase;
  cycleNumber?: number;
  stepIndex?: number;
  targetTemperature: number;
  remainingInPhaseSeconds: number;
  progressFraction: number;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function resolveTiming(protocol: Protocol, elapsedSeconds: number, totalSeconds: number): TimingResult {
  const progressFraction = totalSeconds > 0 ? clamp01(elapsedSeconds / totalSeconds) : 1;
  let t = elapsedSeconds;

  if (protocol.initial) {
    if (t < protocol.initial.durationSeconds) {
      return {
        phase: 'initial',
        targetTemperature: protocol.initial.temperature,
        remainingInPhaseSeconds: protocol.initial.durationSeconds - t,
        progressFraction,
      };
    }
    t -= protocol.initial.durationSeconds;
  }

  const cycleDuration = protocol.cycles.steps.reduce((sum, step) => sum + step.durationSeconds, 0);
  const totalCyclesTime = cycleDuration * protocol.cycles.count;

  if (cycleDuration > 0 && t < totalCyclesTime) {
    const cycleNumber = Math.floor(t / cycleDuration) + 1;
    let tInCycle = t % cycleDuration;
    for (let i = 0; i < protocol.cycles.steps.length; i++) {
      const step = protocol.cycles.steps[i];
      if (tInCycle < step.durationSeconds) {
        return {
          phase: 'cycle',
          cycleNumber,
          stepIndex: i,
          targetTemperature: step.temperature,
          remainingInPhaseSeconds: step.durationSeconds - tInCycle,
          progressFraction,
        };
      }
      tInCycle -= step.durationSeconds;
    }
  }
  t -= totalCyclesTime;

  if (protocol.finalExtension) {
    if (t < protocol.finalExtension.durationSeconds) {
      return {
        phase: 'final_extension',
        targetTemperature: protocol.finalExtension.temperature,
        remainingInPhaseSeconds: protocol.finalExtension.durationSeconds - t,
        progressFraction,
      };
    }
    t -= protocol.finalExtension.durationSeconds;
  }

  if (protocol.hold) {
    return {
      phase: 'hold',
      targetTemperature: protocol.hold.temperature,
      remainingInPhaseSeconds: Infinity,
      progressFraction: 1,
    };
  }

  return { phase: 'completed', targetTemperature: 0, remainingInPhaseSeconds: 0, progressFraction: 1 };
}
