import { useId, useMemo } from 'react';
import { Protocol } from '@thermocycler/core';
import { formatDuration, temperatureColor } from '../lib/format';

const WIDTH = 1000;
const HEIGHT = 260;
const PAD_Y = 18;
const MAX_T = 105;
const HOLD_FRACTION = 0.05;
const GRID_TEMPS = [4, 25, 50, 72, 95];

interface Segment {
  start: number;
  end: number;
  temperature: number;
}

interface Band {
  label: string;
  start: number;
  end: number;
}

function buildTimeline(protocol: Protocol) {
  const segments: Segment[] = [];
  const bands: Band[] = [];
  let t = 0;

  const push = (duration: number, temperature: number) => {
    segments.push({ start: t, end: t + duration, temperature });
    t += duration;
  };

  if (protocol.initial) {
    const start = t;
    push(protocol.initial.durationSeconds, protocol.initial.temperature);
    bands.push({ label: 'Inicial', start, end: t });
  }

  const cycleStart = t;
  for (let c = 0; c < protocol.cycles.count; c++) {
    for (const step of protocol.cycles.steps) push(step.durationSeconds, step.temperature);
  }
  bands.push({ label: `${protocol.cycles.count} ciclos`, start: cycleStart, end: t });

  if (protocol.finalExtension) {
    const start = t;
    push(protocol.finalExtension.durationSeconds, protocol.finalExtension.temperature);
    bands.push({ label: 'Ext. final', start, end: t });
  }

  const total = t;
  const holdWidth = protocol.hold ? Math.max(total * HOLD_FRACTION, 1) : 0;
  if (protocol.hold) {
    segments.push({ start: total, end: total + holdWidth, temperature: protocol.hold.temperature });
    bands.push({ label: 'Hold', start: total, end: total + holdWidth });
  }

  return { segments, bands, total, span: total + holdWidth };
}

const yFor = (temperature: number) => PAD_Y + (1 - temperature / MAX_T) * (HEIGHT - PAD_Y * 2);

interface ThermalProfileProps {
  protocol: Protocol;
  isDraft: boolean;
  elapsedSeconds: number;
  active: boolean;
}

export function ThermalProfile({ protocol, isDraft, elapsedSeconds, active }: ThermalProfileProps) {
  const gradientId = useId();
  const clipId = useId();
  const { segments, bands, total, span } = useMemo(() => buildTimeline(protocol), [protocol]);

  const xFor = (seconds: number) => (span > 0 ? (seconds / span) * WIDTH : 0);

  const linePath = useMemo(() => {
    if (segments.length === 0) return '';
    const rampWidth = span * 0.0015;
    return segments
      .map((s, i) => {
        const x0 = xFor(i === 0 ? s.start : Math.min(s.start + rampWidth, s.end));
        const x1 = xFor(s.end);
        const y = yFor(s.temperature);
        return `${i === 0 ? 'M' : 'L'}${x0.toFixed(2)},${y.toFixed(2)} L${x1.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, span]);

  const areaPath = linePath ? `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` : '';

  const markerSeconds = elapsedSeconds >= total && protocol.hold ? total + (span - total) * 0.5 : elapsedSeconds;
  const markerX = xFor(Math.min(markerSeconds, span));
  const markerSegment = segments.find(s => markerSeconds >= s.start && markerSeconds <= s.end) ?? segments.at(-1);
  const markerY = markerSegment ? yFor(markerSegment.temperature) : HEIGHT;

  return (
    <section className="card profile" aria-labelledby="profile-title">
      <header className="card__head">
        <div>
          <p className="eyebrow">Perfil térmico</p>
          <h2 id="profile-title" className="card__title">
            Temperatura vs. tiempo
          </h2>
        </div>
        <div className="profile__meta">
          {isDraft && <span className="tag tag--muted">Vista previa del borrador</span>}
          <span className="tag">{formatDuration(total)} + hold</span>
        </div>
      </header>

      <div className="profile__chart">
        <div className="profile__yaxis" aria-hidden="true">
          {GRID_TEMPS.map(t => (
            <span key={t} style={{ top: `${(yFor(t) / HEIGHT) * 100}%`, color: temperatureColor(t) }}>
              {t}°
            </span>
          ))}
        </div>

        <svg
          className="profile__svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Perfil térmico del protocolo: ${protocol.cycles.count} ciclos, duración ${formatDuration(total)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={temperatureColor(95)} stopOpacity="0.9" />
              <stop offset="45%" stopColor={temperatureColor(60)} stopOpacity="0.55" />
              <stop offset="100%" stopColor={temperatureColor(4)} stopOpacity="0.15" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={active ? markerX : 0} height={HEIGHT} />
            </clipPath>
          </defs>

          {bands.map((b, i) => (
            <rect
              key={b.label}
              x={xFor(b.start)}
              y={0}
              width={Math.max(0, xFor(b.end) - xFor(b.start))}
              height={HEIGHT}
              className={i % 2 === 0 ? 'profile__band' : 'profile__band profile__band--alt'}
            />
          ))}

          {GRID_TEMPS.map(t => (
            <line key={t} x1={0} x2={WIDTH} y1={yFor(t)} y2={yFor(t)} className="profile__grid" />
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} opacity={0.18} />
          <path d={areaPath} fill={`url(#${gradientId})`} opacity={0.75} clipPath={`url(#${clipId})`} />
          <path d={linePath} className="profile__line" vectorEffect="non-scaling-stroke" />

          {active && (
            <>
              <line x1={markerX} x2={markerX} y1={0} y2={HEIGHT} className="profile__marker" vectorEffect="non-scaling-stroke" />
              <circle cx={markerX} cy={markerY} r={5} className="profile__dot" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>

        <div className="profile__bands" aria-hidden="true">
          {bands.map(b => (
            <span key={b.label} style={{ width: `${((b.end - b.start) / span) * 100}%` }}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
