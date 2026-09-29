import { STATE_LABELS } from '../lib/labels';
import { useSimulation } from '../state/simulation';

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
