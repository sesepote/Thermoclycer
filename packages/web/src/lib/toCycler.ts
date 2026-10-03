import { Protocol, StepType } from '@thermocycler/core';
import type { PCRProtocol, PCRStep } from '../cycler/types/pcr';
import { EditorState, defaultEditorState, newStepId } from './editorState';
import { STEP_TYPE_LABELS } from './labels';

// Convierte un protocolo del core (fases + bloque de ciclos) al formato
// del termociclador (lista lineal de pasos + bucle de repetición).

const LID_TEMPERATURE = 105;
const RAMP_RATE: Record<StepType, number> = { denaturation: 4, annealing: 3.5, extension: 3.5, custom: 3.5 };

export function toCyclerProtocol(protocol: Protocol, base?: PCRProtocol): PCRProtocol {
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

  const loops = loopEnd >= loopStart ? [{ id: `loop_${stamp}`, startStepIndex: loopStart, endStepIndex: loopEnd, repeatCount: cycles.count }] : [];
  const sameShape = base && base.steps.length === steps.length && base.loops[0]?.startStepIndex === loops[0]?.startStepIndex && base.loops[0]?.endStepIndex === loops[0]?.endStepIndex;
  if (sameShape && base) {
    steps.forEach((step, i) => {
      const prev = base.steps[i];
      step.rampRate = prev.rampRate ?? step.rampRate;
      step.gradient = prev.gradient;
      step.tempIncrement = prev.tempIncrement;
      step.timeIncrement = prev.timeIncrement;
    });
  }

  return {
    id: `editor_${stamp}`,
    name: protocol.nombre?.trim() || 'Programa del editor',
    description: 'Enviado desde el editor de protocolo.',
    lidTemperature: base?.lidTemperature ?? LID_TEMPERATURE,
    lidHeatingEnabled: base?.lidHeatingEnabled ?? true,
    sampleVolume: base?.sampleVolume ?? 50,
    steps,
    loops,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

// El editor tiene una fase inicial, un bloque de ciclos, una extensión
// final y un hold. El resto (gradiente, rampa, incrementos) se queda en
// el equipo y se conserva al volver a cargarlo si la forma no cambia.
export function fromCyclerProtocol(protocol: PCRProtocol): EditorState {
  const fallback = defaultEditorState();
  const loop = [...protocol.loops].sort((a, b) => b.repeatCount - a.repeatCount)[0];
  const before = loop ? protocol.steps.slice(0, loop.startStepIndex) : [];
  const cycled = loop ? protocol.steps.slice(loop.startStepIndex, loop.endStepIndex + 1) : protocol.steps.filter(s => !s.isInfiniteHold);
  const after = loop ? protocol.steps.slice(loop.endStepIndex + 1) : [];
  const hold = [...after].reverse().find(s => s.isInfiniteHold);
  const finalExt = [...after].reverse().find(s => !s.isInfiniteHold);
  const infer = (step: PCRStep): StepType => {
    const name = step.name.toLowerCase();
    if (name.includes('desnat') || name.includes('denat') || step.temperature >= 90) return 'denaturation';
    if (name.includes('ext') || name.includes('elong')) return 'extension';
    if (name.includes('hibr') || name.includes('aline') || name.includes('anneal')) return 'annealing';
    return step.temperature >= 68 ? 'extension' : 'annealing';
  };
  const cycleSource = before.length > 1 ? [...before.slice(1), ...cycled] : cycled;
  const cycleSteps = (cycleSource.length ? cycleSource : protocol.steps.filter(s => !s.isInfiniteHold)).map(step => ({
    id: newStepId(),
    type: infer(step),
    label: step.name,
    temperature: step.temperature,
    durationSeconds: step.durationSeconds,
  }));

  return {
    name: protocol.name,
    initial: before[0]
      ? { enabled: true, temperature: before[0].temperature, durationSeconds: before[0].durationSeconds }
      : { ...fallback.initial, enabled: false },
    cycleCount: loop?.repeatCount ?? 1,
    steps: cycleSteps.length ? cycleSteps : fallback.steps,
    finalExtension: finalExt
      ? { enabled: true, temperature: finalExt.temperature, durationSeconds: finalExt.durationSeconds }
      : { ...fallback.finalExtension, enabled: false },
    hold: hold ? { enabled: true, temperature: hold.temperature, durationSeconds: 0 } : { ...fallback.hold, enabled: false },
  };
}
