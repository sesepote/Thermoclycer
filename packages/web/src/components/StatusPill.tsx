import { SimulationState } from '@thermocycler/core';
import { useSimulation } from '../state/simulation';

const STATE_LABELS: Record<SimulationState, string> = {
  IDLE: 'Sin programar',
  PROGRAMMED: 'Programado',
  RUNNING: 'En marcha',
  PAUSED: 'En pausa',
  COMPLETED: 'Completado',
  STOPPED: 'Detenido',
  ERROR: 'Error',
};

// Solo se suscribe al estado (no al tiempo), así que no se re-renderiza en cada frame.
export function StatusPill() {
  const state = useSimulation(s => s.snapshot.state);
  return (
    <span className={`status-pill status-pill--${state.toLowerCase()}`} role="status">
      <span className="status-pill__dot" aria-hidden="true" />
      {STATE_LABELS[state]}
    </span>
  );
}
