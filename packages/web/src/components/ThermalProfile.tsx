import { PointerEvent, memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Protocol } from '@thermocycler/core';
import { formatClock, formatDuration, temperatureColor } from '../lib/format';
import { useSimulation } from '../state/simulation';
import { STEP_TYPE_LABELS } from './StepRow';

// Coordenadas en unidades del viewBox (el SVG se estira al ancho disponible).
const WIDTH = 1000;
const HEIGHT = 260;
const PAD_Y = 18;
const MAX_T = 105;
const HOLD_FRACTION = 0.05; // ancho visual del hold, que en realidad es indefinido
const RAMP_FRACTION = 0.0015; // pendiente visual entre segmentos
const GRID_TEMPS = [4, 25, 50, 72, 95];
const TOUCH_TOOLTIP_MS = 1500;

/* ---------- Línea temporal del protocolo ---------- */

interface Segment {
  start: number;
  end: number;
  temperature: number;
  label: string;
}

interface Timeline {
  segments: Segment[]; // ordenados por tiempo, sin solapes
  bands: { label: string; start: number; end: number }[];
  total: number; // sin hold
  span: number; // con el hold visual
  line: string;
  area: string;
}

const yFor = (temperature: number) => PAD_Y + (1 - temperature / MAX_T) * (HEIGHT - PAD_Y * 2);
const safe = (seconds: number) => Math.max(0, seconds) || 0; // el borrador puede tener valores inválidos

// Se calcula una vez por protocolo (useMemo), no por frame.
function buildTimeline({ initial, cycles, finalExtension, hold }: Protocol): Timeline {
  const segments: Segment[] = [];
  const bands: Timeline['bands'] = [];
  let t = 0;
  const push = (duration: number, temperature: number, label: string) => {
    segments.push({ start: t, end: (t += safe(duration)), temperature, label });
  };
  const band = (label: string, fill: () => void) => {
    const start = t;
    fill();
    bands.push({ label, start, end: t });
  };

  if (initial) band('Inicial', () => push(initial.durationSeconds, initial.temperature, 'Desnaturalización inicial'));
  band(`${cycles.count} ciclos`, () => {
    for (let c = 1; c <= cycles.count; c++) {
      for (const s of cycles.steps) push(s.durationSeconds, s.temperature, `Ciclo ${c} · ${s.label || STEP_TYPE_LABELS[s.type]}`);
    }
  });
  if (finalExtension) band('Ext. final', () => push(finalExtension.durationSeconds, finalExtension.temperature, 'Extensión final'));
  const total = t;
  if (hold) band('Hold', () => push(Math.max(total * HOLD_FRACTION, 1), hold.temperature, 'Mantenimiento'));
  const span = t;

  const x = (s: number) => (span > 0 ? (s / span) * WIDTH : 0).toFixed(2);
  const ramp = span * RAMP_FRACTION;
  const line = segments
    .map((s, i) => {
      const y = yFor(s.temperature).toFixed(2);
      return `${i ? 'L' : 'M'}${x(i ? Math.min(s.start + ramp, s.end) : s.start)},${y} L${x(s.end)},${y}`;
    })
    .join(' ');

  return { segments, bands, total, span, line, area: line && `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` };
}

// Búsqueda binaria del segmento que contiene un instante: O(log n) en
// cada frame en vez de recorrer cientos de segmentos (ciclos × pasos).
function segmentAt(segments: Segment[], seconds: number): Segment | undefined {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].end < seconds) lo = mid + 1;
    else hi = mid;
  }
  return segments[lo];
}

/* ---------- Componente ---------- */

interface ThermalProfileProps {
  protocol: Protocol;
  isDraft: boolean;
  active: boolean;
}

export const ThermalProfile = memo(function ThermalProfile({ protocol, isDraft, active }: ThermalProfileProps) {
  const gradientId = useId();
  const timeline = useMemo(() => buildTimeline(protocol), [protocol]);
  const { bands, total, span, line, area } = timeline;
  const inspector = useInspector(timeline);

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

      <div className="profile__chart" data-no-swipe>
        {/* Eje Y */}
        <div className="profile__yaxis" aria-hidden="true">
          {GRID_TEMPS.map(t => (
            <span key={t} style={{ top: `${(yFor(t) / HEIGHT) * 100}%`, color: temperatureColor(t) }}>
              {t}°
            </span>
          ))}
        </div>

        {/* Gráfica; se inspecciona pasando el ratón o arrastrando el dedo */}
        <div className="profile__plot" {...inspector.handlers}>
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
            </defs>

            {bands.map((b, i) => (
              <rect
                key={b.label}
                x={(b.start / span) * WIDTH || 0}
                y={0}
                width={Math.max(0, ((b.end - b.start) / span) * WIDTH) || 0}
                height={HEIGHT}
                className={i % 2 ? 'profile__band profile__band--alt' : 'profile__band'}
              />
            ))}
            {GRID_TEMPS.map(t => (
              <line key={t} x1={0} x2={WIDTH} y1={yFor(t)} y2={yFor(t)} className="profile__grid" />
            ))}

            <path d={area} fill={`url(#${gradientId})`} opacity={0.18} />
            {active && <ProgressOverlay timeline={timeline} gradientId={gradientId} />}
            <path d={line} className="profile__line" vectorEffect="non-scaling-stroke" />

            {inspector.point && (
              <line x1={inspector.point.x} x2={inspector.point.x} y1={0} y2={HEIGHT} className="profile__inspect" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {inspector.point && (
            <div className="profile__tooltip" style={{ left: `${inspector.point.frac * 100}%`, transform: `translateX(-${inspector.point.frac * 100}%)` }}>
              <strong className="mono" style={{ color: temperatureColor(inspector.point.segment.temperature) }}>
                {inspector.point.segment.temperature} °C
              </strong>
              <span>{inspector.point.segment.label}</span>
              <span className="mono muted">{inspector.point.seconds > total ? 'indefinido' : formatClock(inspector.point.seconds)}</span>
            </div>
          )}
        </div>

        <div className="profile__bands" aria-hidden="true">
          {bands.map(b => (
            <span key={b.label} style={{ width: `${((b.end - b.start) / span) * 100 || 0}%` }}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ---------- Progreso en vivo: único trozo que se actualiza por frame ---------- */

const ProgressOverlay = memo(function ProgressOverlay({ timeline, gradientId }: { timeline: Timeline; gradientId: string }) {
  const clipId = useId();
  const elapsed = useSimulation(s => s.snapshot.elapsedSeconds);
  const { segments, total, span, area } = timeline;

  // Durante el hold el marcador se queda en mitad de su banda.
  const seconds = elapsed >= total && span > total ? total + (span - total) / 2 : elapsed;
  const x = span > 0 ? (Math.min(seconds, span) / span) * WIDTH : 0;
  const segment = segmentAt(segments, seconds);
  const y = segment ? yFor(segment.temperature) : HEIGHT;

  return (
    <>
      <clipPath id={clipId}>
        <rect x={0} y={0} width={x} height={HEIGHT} />
      </clipPath>
      <path d={area} fill={`url(#${gradientId})`} opacity={0.75} clipPath={`url(#${clipId})`} />
      <line x1={x} x2={x} y1={0} y2={HEIGHT} className="profile__marker" vectorEffect="non-scaling-stroke" />
      <circle cx={x} cy={y} r={5} className="profile__dot" vectorEffect="non-scaling-stroke" />
    </>
  );
});

/* ---------- Inspección con ratón o dedo ---------- */

interface InspectPoint {
  frac: number;
  x: number;
  seconds: number;
  segment: Segment;
}

// Ratón: sigue al cursor. Táctil/lápiz: sigue al dedo mientras arrastra
// en horizontal (el vertical sigue siendo scroll por touch-action: pan-y)
// y deja la lectura visible un momento al soltar.
function useInspector({ segments, span }: Timeline) {
  const [point, setPoint] = useState<InspectPoint | null>(null);
  const hideTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const inspect = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const segment = segmentAt(segments, frac * span);
    window.clearTimeout(hideTimer.current);
    setPoint(segment ? { frac, x: frac * WIDTH, seconds: frac * span, segment } : null);
  };
  const hide = () => setPoint(null);

  return {
    point,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLDivElement>) {
        e.currentTarget.setPointerCapture(e.pointerId);
        inspect(e);
      },
      onPointerMove(e: PointerEvent<HTMLDivElement>) {
        if (e.pointerType === 'mouse' || e.buttons) inspect(e);
      },
      onPointerUp(e: PointerEvent<HTMLDivElement>) {
        if (e.pointerType !== 'mouse') hideTimer.current = window.setTimeout(hide, TOUCH_TOOLTIP_MS);
      },
      onPointerLeave(e: PointerEvent<HTMLDivElement>) {
        if (e.pointerType === 'mouse') hide();
      },
      onPointerCancel: hide,
    },
  };
}
