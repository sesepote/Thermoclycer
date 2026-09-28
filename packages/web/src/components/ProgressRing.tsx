const SIZE = 184;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  fraction: number;
  color: string;
  children: React.ReactNode;
}

export function ProgressRing({ fraction, color, children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction || 0));

  return (
    <div
      className="ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label="Progreso del protocolo"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="ring__bar"
        />
      </svg>
      <div className="ring__content">
        {children}
        <span className="ring__pct mono">{Math.round(clamped * 100)}%</span>
      </div>
    </div>
  );
}
