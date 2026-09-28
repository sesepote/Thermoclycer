import { Protocol, StepType } from '@thermocycler/core';

export interface EditorStep {
  id: string;
  type: StepType;
  label?: string;
  temperature: number;
  durationSeconds: number;
}

export interface EditorState {
  includeInitial: boolean;
  initialTemperature: number;
  initialDuration: number;
  cycleCount: number;
  steps: EditorStep[];
  includeFinalExtension: boolean;
  finalExtensionTemperature: number;
  finalExtensionDuration: number;
  includeHold: boolean;
  holdTemperature: number;
}

export function newStepId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `step-${Math.random().toString(36).slice(2)}`;
}

// Los valores por defecto son literalmente el ejemplo de la sección 5
// de la spec, para que la primera vez que se abre la app haya algo
// coherente en pantalla en vez de un formulario vacío.
export function defaultEditorState(): EditorState {
  return {
    includeInitial: true,
    initialTemperature: 95,
    initialDuration: 180,
    cycleCount: 35,
    steps: [
      { id: newStepId(), type: 'denaturation', temperature: 95, durationSeconds: 30 },
      { id: newStepId(), type: 'annealing', temperature: 60, durationSeconds: 30 },
      { id: newStepId(), type: 'extension', temperature: 72, durationSeconds: 45 },
    ],
    includeFinalExtension: true,
    finalExtensionTemperature: 72,
    finalExtensionDuration: 300,
    includeHold: true,
    holdTemperature: 4,
  };
}

export function buildProtocol(state: EditorState): Protocol {
  return {
    id: 'editor-protocol',
    initial: state.includeInitial
      ? { temperature: state.initialTemperature, durationSeconds: state.initialDuration }
      : undefined,
    cycles: {
      count: state.cycleCount,
      steps: state.steps.map(step => ({
        type: step.type,
        label: step.label,
        temperature: step.temperature,
        durationSeconds: step.durationSeconds,
      })),
    },
    finalExtension: state.includeFinalExtension
      ? { temperature: state.finalExtensionTemperature, durationSeconds: state.finalExtensionDuration }
      : undefined,
    hold: state.includeHold ? { temperature: state.holdTemperature } : undefined,
  };
}

export function protocolToEditorState(protocol: Protocol): EditorState {
  const fallback = defaultEditorState();
  return {
    includeInitial: protocol.initial !== undefined,
    initialTemperature: protocol.initial?.temperature ?? fallback.initialTemperature,
    initialDuration: protocol.initial?.durationSeconds ?? fallback.initialDuration,
    cycleCount: protocol.cycles.count,
    steps: protocol.cycles.steps.map(step => ({
      id: newStepId(),
      type: step.type,
      label: step.label,
      temperature: step.temperature,
      durationSeconds: step.durationSeconds,
    })),
    includeFinalExtension: protocol.finalExtension !== undefined,
    finalExtensionTemperature: protocol.finalExtension?.temperature ?? fallback.finalExtensionTemperature,
    finalExtensionDuration: protocol.finalExtension?.durationSeconds ?? fallback.finalExtensionDuration,
    includeHold: protocol.hold !== undefined,
    holdTemperature: protocol.hold?.temperature ?? fallback.holdTemperature,
  };
}

// Formato JSON externo (snake_case) que entiende parseProtocolJson.
export function protocolToJson(protocol: Protocol): string {
  const phase = (p?: { temperature: number; durationSeconds: number }) =>
    p ? { temperature: p.temperature, duration_seconds: p.durationSeconds } : undefined;

  return JSON.stringify(
    {
      initial: phase(protocol.initial),
      cycles: {
        count: protocol.cycles.count,
        steps: protocol.cycles.steps.map(step => ({
          type: step.type === 'custom' ? step.label ?? 'custom' : step.type,
          temperature: step.temperature,
          duration_seconds: step.durationSeconds,
        })),
      },
      final_extension: phase(protocol.finalExtension),
      hold: protocol.hold,
    },
    null,
    2,
  );
}

export interface ProtocolPreset {
  id: string;
  name: string;
  description: string;
  build: () => EditorState;
}

export const PROTOCOL_PRESETS: ProtocolPreset[] = [
  {
    id: 'standard-3-step',
    name: 'PCR estándar',
    description: '3 pasos · 35 ciclos',
    build: defaultEditorState,
  },
  {
    id: 'fast-2-step',
    name: 'PCR rápida',
    description: '2 pasos · 30 ciclos',
    build: () => ({
      ...defaultEditorState(),
      initialDuration: 120,
      cycleCount: 30,
      steps: [
        { id: newStepId(), type: 'denaturation', temperature: 98, durationSeconds: 10 },
        { id: newStepId(), type: 'extension', temperature: 68, durationSeconds: 30 },
      ],
      finalExtensionDuration: 120,
    }),
  },
  {
    id: 'colony',
    name: 'PCR de colonia',
    description: 'lisis larga · 30 ciclos',
    build: () => ({
      ...defaultEditorState(),
      initialDuration: 600,
      cycleCount: 30,
      steps: [
        { id: newStepId(), type: 'denaturation', temperature: 95, durationSeconds: 30 },
        { id: newStepId(), type: 'annealing', temperature: 55, durationSeconds: 30 },
        { id: newStepId(), type: 'extension', temperature: 72, durationSeconds: 60 },
      ],
      finalExtensionDuration: 600,
    }),
  },
];
