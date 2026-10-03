import { RUN_LABELS } from '../lib/labels';
import { useInstrument } from '../state/instrument';

// Solo se suscribe al estado del equipo (no a las temperaturas).
export function StatusPill() {
  const run = useInstrument(s => s.run);
  return (
    <span className={`status-pill status-pill--${run}`} role="status">
      <span className="status-pill__dot" aria-hidden="true" />
      {RUN_LABELS[run]}
    </span>
  );
}
