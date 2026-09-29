import { ReactNode } from 'react';

// Geometría en unidades del viewBox; el tamaño real lo decide el CSS
// (.ring), así el anillo se adapta a móvil, tablet y escritorio.
const SIZE = 184;
const STROKE = 10;
const C = SIZE / 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  fraction: number;
  color: string;
  label?: string;
  children: ReactNode;
}

export function ProgressRing({ fraction, color, label = 'Progreso del protocolo', children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction || 0));
  const pct = Math.round(clamped * 100);

  return (
    <div className="ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={C} cy={C} r={RADIUS} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
        <circle
          className="ring__bar"
          cx={C}
          cy={C}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform={`rotate(-90 ${C} ${C})`}
        />
      </svg>
      <div className="ring__content">
        {children}
        <span className="ring__pct mono">{pct}%</span>
      </div>
    </div>
  );
}
