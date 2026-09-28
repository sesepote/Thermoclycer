import { useMemo, useState } from 'react';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import {
  calculateAnnealingTemperatureRange,
  calculateGcContent,
  calculateLength,
  calculateTm,
} from '@thermocycler/core';
import { demoAssay } from '../lib/knowledge';
import { temperatureColor } from '../lib/format';

const BASES = ['A', 'T', 'G', 'C'] as const;

function baseCounts(sequence: string) {
  const clean = sequence.toUpperCase().replace(/[^ATGC]/g, '');
  const counts = { A: 0, T: 0, G: 0, C: 0 };
  for (const b of clean) counts[b as keyof typeof counts]++;
  return { counts, total: clean.length };
}

interface PrimerCardProps {
  title: string;
  direction: string;
  sequence: string;
  onChange: (value: string) => void;
}

function PrimerCard({ title, direction, sequence, onChange }: PrimerCardProps) {
  const length = useMemo(() => calculateLength(sequence), [sequence]);
  const gc = useMemo(() => calculateGcContent(sequence), [sequence]);
  const tm = useMemo(() => calculateTm(sequence), [sequence]);
  const { counts, total } = useMemo(() => baseCounts(sequence), [sequence]);
  const id = `primer-${direction}`;
  const gcValue = gc.ok ? gc.result.value : undefined;

  return (
    <article className="card primer">
      <header className="card__head">
        <div>
          <p className="eyebrow">{direction}</p>
          <h3 className="card__title">{title}</h3>
        </div>
        <span className="tag mono">{"5' → 3'"}</span>
      </header>

      <label htmlFor={id} className="field-label">
        Secuencia
      </label>
      <textarea
        id={id}
        className="primer__seq mono"
        rows={3}
        spellCheck={false}
        value={sequence}
        onChange={e => onChange(e.target.value.toUpperCase())}
      />

      <div className="seq-view mono" aria-hidden="true">
        {sequence
          .toUpperCase()
          .split('')
          .map((b, i) => (
            <span key={i} className={`base base--${/[ATGC]/.test(b) ? b : 'x'}`}>
              {b}
            </span>
          ))}
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric__label">Longitud</span>
          <span className="metric__value mono">{length.ok ? `${length.result.value} nt` : '—'}</span>
        </div>
        <div className="metric">
          <span className="metric__label">Contenido GC</span>
          <span className="metric__value mono">{gcValue !== undefined ? `${gcValue.toFixed(1)}%` : '—'}</span>
          <div className="meter" aria-hidden="true">
            <span className="meter__ideal" />
            <span className="meter__fill" style={{ width: `${gcValue ?? 0}%` }} />
          </div>
        </div>
        <div className="metric">
          <span className="metric__label">Tm estimada</span>
          <span className="metric__value mono" style={{ color: tm.ok ? temperatureColor(tm.result.value) : undefined }}>
            {tm.ok ? `${tm.result.value.toFixed(1)} °C` : '—'}
          </span>
          {tm.ok && tm.result.method && <span className="metric__hint">{tm.result.method}</span>}
        </div>
      </div>

      {total > 0 && (
        <div className="composition" aria-label="Composición de bases">
          {BASES.map(b => (
            <span
              key={b}
              className={`composition__seg base--${b}`}
              style={{ flexGrow: counts[b] || 0.0001 }}
              title={`${b}: ${counts[b]}`}
            >
              {counts[b] > 0 && `${b} ${counts[b]}`}
            </span>
          ))}
        </div>
      )}

      {!tm.ok && (
        <p className="notice notice--warn">
          <TriangleAlert size={16} aria-hidden="true" />
          {tm.reason}
        </p>
      )}
    </article>
  );
}

interface PrimerLabProps {
  annealingTemperature?: number;
  onApplyAnnealing: (temperature: number) => void;
}

export function PrimerLab({ annealingTemperature, onApplyAnnealing }: PrimerLabProps) {
  const [forward, setForward] = useState(demoAssay?.primerForward?.secuencia ?? '');
  const [reverse, setReverse] = useState(demoAssay?.primerReverse?.secuencia ?? '');

  const range = useMemo(
    () =>
      calculateAnnealingTemperatureRange(
        { id: 'fwd', nombre: 'Forward', secuencia: forward },
        { id: 'rev', nombre: 'Reverse', secuencia: reverse },
      ),
    [forward, reverse],
  );

  const inRange =
    range.ok && annealingTemperature !== undefined
      ? annealingTemperature >= range.result.value.min && annealingTemperature <= range.result.value.max
      : undefined;

  const scaleMin = 40;
  const scaleMax = 80;
  const pct = (t: number) => `${((Math.min(scaleMax, Math.max(scaleMin, t)) - scaleMin) / (scaleMax - scaleMin)) * 100}%`;

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Análisis de oligonucleótidos</p>
        <h1 className="page__title">Laboratorio de primers</h1>
        <p className="page__lead">
          Edita las secuencias para calcular longitud, contenido GC y Tm, y obtener el rango de hibridación recomendado para tu
          protocolo.
        </p>
      </div>

      <div className="primer-grid">
        <PrimerCard title={demoAssay?.primerForward?.nombre ?? 'Forward'} direction="Forward" sequence={forward} onChange={setForward} />
        <PrimerCard title={demoAssay?.primerReverse?.nombre ?? 'Reverse'} direction="Reverse" sequence={reverse} onChange={setReverse} />
      </div>

      <section className="card annealing" aria-labelledby="annealing-title">
        <header className="card__head">
          <div>
            <p className="eyebrow">Resultado</p>
            <h2 id="annealing-title" className="card__title">
              Rango de hibridación
            </h2>
          </div>
          {inRange !== undefined && (
            <span className={`tag ${inRange ? 'tag--ok' : 'tag--error'}`}>
              Tu protocolo: {annealingTemperature} °C · {inRange ? 'dentro de rango' : 'fuera de rango'}
            </span>
          )}
        </header>

        {range.ok ? (
          <>
            <div className="range-scale">
              <div
                className="range-scale__band"
                style={{ left: pct(range.result.value.min), width: `calc(${pct(range.result.value.max)} - ${pct(range.result.value.min)})` }}
              />
              <div className="range-scale__rec" style={{ left: pct(range.result.value.recommended) }}>
                <span className="mono">{range.result.value.recommended} °C</span>
              </div>
              {annealingTemperature !== undefined && (
                <div className={`range-scale__user ${inRange ? 'is-ok' : 'is-bad'}`} style={{ left: pct(annealingTemperature) }}>
                  <span className="mono">Tú</span>
                </div>
              )}
              <div className="range-scale__ticks mono" aria-hidden="true">
                {[40, 50, 60, 70, 80].map(t => (
                  <span key={t}>{t}°</span>
                ))}
              </div>
            </div>

            <div className="annealing__summary">
              <div className="metric">
                <span className="metric__label">Mínimo</span>
                <span className="metric__value mono">{range.result.value.min} °C</span>
              </div>
              <div className="metric metric--accent">
                <span className="metric__label">Recomendado</span>
                <span className="metric__value mono">{range.result.value.recommended} °C</span>
              </div>
              <div className="metric">
                <span className="metric__label">Máximo</span>
                <span className="metric__value mono">{range.result.value.max} °C</span>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => onApplyAnnealing(range.result.value.recommended)}>
                Aplicar al protocolo
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>

            {range.result.warnings && range.result.warnings.length > 0 && (
              <ul className="warnings">
                {range.result.warnings.map(w => (
                  <li key={w}>
                    <TriangleAlert size={14} aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="notice notice--warn">
            <TriangleAlert size={16} aria-hidden="true" />
            {range.reason}
          </p>
        )}
      </section>
    </div>
  );
}
