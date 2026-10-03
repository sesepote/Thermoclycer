import { useMemo, useState } from 'react';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { Base, analyzeSequence, calculateAnnealingTemperatureRange, calculateTm } from '@thermocycler/core';
import { demoAssay } from '../lib/knowledge';
import { temperatureColor } from '../lib/format';
import { useApp } from '../state/app';

const BASES: Base[] = ['A', 'T', 'G', 'C'];
const SCALE = { min: 40, max: 80 };
const TICKS = [40, 50, 60, 70, 80];

// Posición (%) de una temperatura en la escala de hibridación.
const pct = (t: number) => `${((Math.min(SCALE.max, Math.max(SCALE.min, t)) - SCALE.min) / (SCALE.max - SCALE.min)) * 100}%`;

/* ---------- Tarjeta de un primer ---------- */

interface PrimerCardProps {
  title: string;
  direction: string;
  sequence: string;
  onChange: (value: string) => void;
}

function PrimerCard({ title, direction, sequence, onChange }: PrimerCardProps) {
  // Un único análisis de la secuencia alimenta longitud, GC y composición.
  const analysis = useMemo(() => analyzeSequence(sequence), [sequence]);
  const tm = useMemo(() => calculateTm(sequence), [sequence]);
  const stats = analysis.ok ? analysis.stats : undefined;
  const gc = stats ? (stats.gc / stats.length) * 100 : undefined;
  const id = `primer-${direction}`;

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
        autoCapitalize="characters"
        autoCorrect="off"
        value={sequence}
        onChange={e => onChange(e.target.value.toUpperCase())}
      />

      {/* Secuencia coloreada por base */}
      <div className="seq-view mono" aria-hidden="true" data-no-swipe>
        {[...sequence].map((b, i) => (
          <span key={i} className={`base base--${'ATGC'.includes(b) ? b : 'x'}`}>
            {b}
          </span>
        ))}
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric__label">Longitud</span>
          <span className="metric__value mono">{stats ? `${stats.length} nt` : '—'}</span>
        </div>
        <div className="metric">
          <span className="metric__label">Contenido GC</span>
          <span className="metric__value mono">{gc !== undefined ? `${gc.toFixed(1)}%` : '—'}</span>
          <div className="meter" aria-hidden="true">
            <span className="meter__ideal" />
            <span className="meter__fill" style={{ width: `${gc ?? 0}%` }} />
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

      {/* Composición de bases */}
      {stats && (
        <div className="composition" aria-label="Composición de bases">
          {BASES.map(b => (
            <span key={b} className={`composition__seg base--${b}`} style={{ flexGrow: stats.counts[b] || 0.0001 }} title={`${b}: ${stats.counts[b]}`}>
              {stats.counts[b] > 0 && `${b} ${stats.counts[b]}`}
            </span>
          ))}
        </div>
      )}

      {!analysis.ok && (
        <p className="notice notice--warn">
          <TriangleAlert size={16} aria-hidden="true" />
          {analysis.reason}
        </p>
      )}
    </article>
  );
}

/* ---------- Vista: dos primers + rango de hibridación ---------- */

export default function PrimerLab() {
  const annealingTemperature = useApp(s => s.annealingTemperature);
  const applyAnnealing = useApp(s => s.applyAnnealing);
  const [forward, setForward] = useState(demoAssay?.primerForward?.secuencia ?? '');
  const [reverse, setReverse] = useState(demoAssay?.primerReverse?.secuencia ?? '');

  const range = useMemo(() => calculateAnnealingTemperatureRange({ secuencia: forward }, { secuencia: reverse }), [forward, reverse]);
  const r = range.ok ? range.result.value : undefined;
  const inRange = r && annealingTemperature !== undefined ? annealingTemperature >= r.min && annealingTemperature <= r.max : undefined;

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Análisis de oligonucleótidos</p>
        <h1 className="page__title">Laboratorio de primers</h1>
        <p className="page__lead">
          Edita las secuencias para calcular longitud, contenido GC y Tm, y obtener el rango de hibridación recomendado para tu protocolo.
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

        {range.ok && r ? (
          <>
            {/* Escala visual: banda aceptable, recomendado y valor actual */}
            <div className="range-scale">
              <div className="range-scale__band" style={{ left: pct(r.min), width: `calc(${pct(r.max)} - ${pct(r.min)})` }} />
              <div className="range-scale__rec" style={{ left: pct(r.recommended) }}>
                <span className="mono">{r.recommended} °C</span>
              </div>
              {annealingTemperature !== undefined && (
                <div className={`range-scale__user ${inRange ? 'is-ok' : 'is-bad'}`} style={{ left: pct(annealingTemperature) }}>
                  <span className="mono">Tú</span>
                </div>
              )}
              <div className="range-scale__ticks mono" aria-hidden="true">
                {TICKS.map(t => (
                  <span key={t}>{t}°</span>
                ))}
              </div>
            </div>

            <div className="annealing__summary">
              {(
                [
                  ['Mínimo', r.min, ''],
                  ['Recomendado', r.recommended, 'metric--accent'],
                  ['Máximo', r.max, ''],
                ] as const
              ).map(([label, value, cls]) => (
                <div key={label} className={`metric ${cls}`}>
                  <span className="metric__label">{label}</span>
                  <span className="metric__value mono">{value} °C</span>
                </div>
              ))}
              <button type="button" className="btn btn--primary btn--lg" onClick={() => applyAnnealing(r.recommended)}>
                Aplicar al protocolo
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>

            {!!range.result.warnings?.length && (
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
            {!range.ok && range.reason}
          </p>
        )}
      </section>
    </div>
  );
}
