import { StepType } from '@thermocycler/core';
import type { MachineRunState } from '../cycler/types/pcr';

// Textos de la interfaz para los valores del core y del equipo, en un único sitio.

export const RUN_LABELS: Record<MachineRunState, string> = {
  idle: 'En espera',
  preheating_lid: 'Calentando tapa',
  running: 'En marcha',
  paused: 'En pausa',
  holding: 'Conservación',
  completed: 'Completado',
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  denaturation: 'Desnaturalización',
  annealing: 'Hibridación',
  extension: 'Extensión',
  custom: 'Personalizado',
};
