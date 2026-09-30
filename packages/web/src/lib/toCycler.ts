import { Protocol, StepType } from '@thermocycler/core';
import type { PCRProtocol, PCRStep } from '../cycler/types/pcr';
import { STEP_TYPE_LABELS } from './labels';

// Convierte un protocolo del core (fases + bloque de ciclos) al formato
// del termociclador (lista lineal de pasos + bucle de repetición).

const LID_TEMPERATURE = 105;
const RAMP_RATE: Record<StepType, number> = { denaturation: 4, annealing: 3.5, extension: 3.5, custom: 3.5 };

export function toCyclerProtocol(protocol: Protocol): PCRProtocol {
  const stamp = Date.now();
  const steps: PCRStep[] = [];
  const add = (step: Omit<PCRStep, 'id'>) => steps.push({ id: `ed_${stamp}_${steps.length}`, ...step });

  const { initial, cycles, finalExtension, hold } = protocol;
  if (initial) add({ name: 'Desnaturalización inicial', temperature: initial.temperature, durationSeconds: initial.durationSeconds, rampRate: 4 });
  const loopStart = steps.length;
  for (const s of cycles.steps) add({ name: s.label || STEP_TYPE_LABELS[s.type], temperature: s.temperature, durationSeconds: s.durationSeconds, rampRate: RAMP_RATE[s.type] });
  const loopEnd = steps.length - 1;
  if (finalExtension) add({ name: 'Extensión final', temperature: finalExtension.temperature, durationSeconds: finalExtension.durationSeconds, rampRate: 4 });
  if (hold) add({ name: `Conservación ${hold.temperature}°C`, temperature: hold.temperature, durationSeconds: 0, isInfiniteHold: true, rampRate: 3 });

  return {
    id: `editor_${stamp}`,
    name: protocol.nombre?.trim() || 'Programa del editor',
    description: 'Enviado desde el editor de protocolo.',
    lidTemperature: LID_TEMPERATURE,
    lidHeatingEnabled: true,
    sampleVolume: 50,
    steps,
    loops: loopEnd >= loopStart ? [{ id: `loop_${stamp}`, startStepIndex: loopStart, endStepIndex: loopEnd, repeatCount: cycles.count }] : [],
    createdAt: new Date().toISOString().slice(0, 10),
  };
}
