// El protocolo NO asume un número fijo de pasos por ciclo. "steps" es un
// array abierto: puede tener 3 pasos (denat/annealing/extension), 2 (los
// llamados protocolos "de 2 pasos"), o más si alguien mete un paso extra.

export type StepType = 'denaturation' | 'annealing' | 'extension' | 'custom';

export interface ProtocolStep {
  type: StepType;
  label?: string; // útil cuando type === 'custom'
  temperature: number; // °C
  durationSeconds: number;
}

export interface ProtocolPhase {
  temperature: number;
  durationSeconds: number;
}

export interface ProtocolCycles {
  count: number;
  steps: ProtocolStep[];
}

export interface Protocol {
  id: string;
  nombre?: string;
  initial?: ProtocolPhase;
  cycles: ProtocolCycles;
  finalExtension?: ProtocolPhase;
  hold?: { temperature: number };
  fuente?: string;
  notas?: string;
}
