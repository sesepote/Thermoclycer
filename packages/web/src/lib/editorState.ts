import { Protocol, ProtocolPhase, StepType } from '@thermocycler/core';

// Estado del formulario del editor. Las fases opcionales guardan sus
// valores aunque estén desactivadas, para no perderlos al reactivarlas.

export interface EditorStep {
  id: string;
  type: StepType;
  label?: string;
  temperature: number;
  durationSeconds: number;
}

export interface EditorPhase {
  enabled: boolean;
  temperature: number;
  durationSeconds: number; // el hold no la usa: se mantiene indefinidamente
}

export interface EditorState {
  name: string;
  initial: EditorPhase;
  cycleCount: number;
  steps: EditorStep[];
  finalExtension: EditorPhase;
  hold: EditorPhase;
}

export type PhaseKey = 'initial' | 'finalExtension' | 'hold';

export const newStepId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `step-${Math.random().toString(36).slice(2)}`;

/* ---------- Construcción de estados ---------- */

type StepSpec = [type: StepType, temperature: number, durationSeconds: number];

function makeState(name: string, cycleCount: number, initialSeconds: number, finalSeconds: number, steps: StepSpec[]): EditorState {
  return {
    name,
    initial: { enabled: true, temperature: 95, durationSeconds: initialSeconds },
    cycleCount,
    steps: steps.map(([type, temperature, durationSeconds]) => ({ id: newStepId(), type, temperature, durationSeconds })),
    finalExtension: { enabled: true, temperature: 72, durationSeconds: finalSeconds },
    hold: { enabled: true, temperature: 4, durationSeconds: 0 },
  };
}

// Por defecto, el ejemplo de la sección 5 de la spec.
export const defaultEditorState = (): EditorState =>
  makeState('PCR estándar', 35, 180, 300, [
    ['denaturation', 95, 30],
    ['annealing', 60, 30],
    ['extension', 72, 45],
  ]);

// Plantillas del editor: añadir una es añadir una entrada.
export const PROTOCOL_PRESETS: { id: string; name: string; description: string; build: () => EditorState }[] = [
  { id: 'standard-3-step', name: 'PCR estándar', description: '3 pasos · 35 ciclos', build: defaultEditorState },
  {
    id: 'fast-2-step',
    name: 'PCR rápida',
    description: '2 pasos · 30 ciclos',
    build: () => makeState('PCR rápida', 30, 120, 120, [['denaturation', 98, 10], ['extension', 68, 30]]),
  },
  {
    id: 'colony',
    name: 'PCR de colonia',
    description: 'lisis larga · 30 ciclos',
    build: () => makeState('PCR de colonia', 30, 600, 600, [['denaturation', 95, 30], ['annealing', 55, 30], ['extension', 72, 60]]),
  },
];

/* ---------- Conversión editor <-> protocolo del core ---------- */

const toPhase = (p: EditorPhase): ProtocolPhase | undefined =>
  p.enabled ? { temperature: p.temperature, durationSeconds: p.durationSeconds } : undefined;

const fromPhase = (p: ProtocolPhase | undefined, fallback: EditorPhase): EditorPhase =>
  p ? { enabled: true, ...p } : { ...fallback, enabled: false };

export function buildProtocol(state: EditorState): Protocol {
  return {
    id: 'editor-protocol',
    nombre: state.name.trim() || 'Sin nombre',
    initial: toPhase(state.initial),
    cycles: { count: state.cycleCount, steps: state.steps.map(({ id: _id, ...step }) => step) },
    finalExtension: toPhase(state.finalExtension),
    hold: state.hold.enabled ? { temperature: state.hold.temperature } : undefined,
  };
}

export function protocolToEditorState(protocol: Protocol): EditorState {
  const fallback = defaultEditorState();
  return {
    name: protocol.nombre ?? 'Protocolo importado',
    initial: fromPhase(protocol.initial, fallback.initial),
    cycleCount: protocol.cycles.count,
    steps: protocol.cycles.steps.map(step => ({ ...step, id: newStepId() })),
    finalExtension: fromPhase(protocol.finalExtension, fallback.finalExtension),
    hold: fromPhase(protocol.hold && { ...protocol.hold, durationSeconds: 0 }, fallback.hold),
  };
}

// Formato JSON externo (snake_case) que entiende parseProtocolJson.
export function protocolToJson(protocol: Protocol): string {
  const phase = (p?: ProtocolPhase) => p && { temperature: p.temperature, duration_seconds: p.durationSeconds };
  return JSON.stringify(
    {
      initial: phase(protocol.initial),
      cycles: {
        count: protocol.cycles.count,
        steps: protocol.cycles.steps.map(s => ({ type: s.type === 'custom' ? s.label || 'custom' : s.type, ...phase(s) })),
      },
      final_extension: phase(protocol.finalExtension),
      hold: protocol.hold,
    },
    null,
    2,
  );
}
