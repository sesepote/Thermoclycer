// Estados de la máquina de la sección 24 de la spec.
export type SimulationState = 'IDLE' | 'PROGRAMMED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED' | 'ERROR';

export type SimulationPhase = 'idle' | 'initial' | 'cycle' | 'final_extension' | 'hold' | 'completed';

export interface SimulationSnapshot {
  state: SimulationState;
  elapsedSeconds: number;
  totalSeconds: number;
  phase: SimulationPhase;
  cycleNumber?: number; // 1-indexado, solo si phase === 'cycle'
  totalCycles?: number; // número de ciclos del protocolo programado
  stepIndex?: number; // solo si phase === 'cycle'
  targetTemperature?: number;
  remainingInPhaseSeconds?: number; // Infinity durante el hold
  progressFraction: number; // 0..1, sobre la duración total sin contar el hold
  error?: string;
}
