import { SimulationState } from '@thermocycler/core';

export const STATE_LABELS: Record<SimulationState, string> = {
  IDLE: 'Sin programar',
  PROGRAMMED: 'Programado',
  RUNNING: 'En marcha',
  PAUSED: 'En pausa',
  COMPLETED: 'Completado',
  STOPPED: 'Detenido',
  ERROR: 'Error',
};

export function StatusPill({ state }: { state: SimulationState }) {
  return (
    <span className={`status-pill status-pill--${state.toLowerCase()}`} role="status">
      <span className="status-pill__dot" aria-hidden="true" />
      {STATE_LABELS[state]}
    </span>
  );
}
