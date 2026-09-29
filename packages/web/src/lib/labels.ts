import { SimulationPhase, SimulationState, StepType } from '@thermocycler/core';

// Textos de la interfaz para los valores del core, en un único sitio.

export const STATE_LABELS: Record<SimulationState, string> = {
  IDLE: 'Sin programar',
  PROGRAMMED: 'Listo',
  RUNNING: 'En marcha',
  PAUSED: 'En pausa',
  COMPLETED: 'Completado',
  STOPPED: 'Detenido',
  ERROR: 'Error',
};

export const PHASE_LABELS: Record<SimulationPhase, string> = {
  idle: 'En espera',
  initial: 'Desnaturalización inicial',
  cycle: 'Ciclado',
  final_extension: 'Extensión final',
  hold: 'Mantenimiento',
  completed: 'Finalizado',
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  denaturation: 'Desnaturalización',
  annealing: 'Hibridación',
  extension: 'Extensión',
  custom: 'Personalizado',
};
