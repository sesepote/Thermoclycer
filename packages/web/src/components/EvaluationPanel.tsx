import { useMemo } from 'react';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { ParameterStatus, Protocol, compareProtocols } from '@thermocycler/core';
import { demoAssay } from '../lib/knowledge';
import { ProgressRing } from './ProgressRing';

const STATUS_LABELS: Record<ParameterStatus, string> = {
  EXACT: 'Exacto',
  ACCEPTED_RANGE: 'Aceptable',
  OUT_OF_RANGE: 'Fuera de rango',
  INVALID: 'Inválido',
  MISSING: 'Falta',
  NOT_APPLICABLE: 'No aplica',
};

const STATUS_ORDER: ParameterStatus[] = ['EXACT', 'ACCEPTED_RANGE', 'OUT_OF_RANGE', 'MISSING', 'INVALID', 'NOT_APPLICABLE'];

function formatValue(value?: number) {
  return value === undefined ? '—' : String(value);
}

interface EvaluationPanelProps {
  draft: Protocol;
  onLoadProtocol: (protocol: Protocol) => void;
}

export function EvaluationPanel({ draft, onLoadProtocol }: EvaluationPanelProps) {
  const reference = demoAssay?.referenceProtocol;
  const comparisons = useMemo(() => (reference ? compareProtocols(reference, draft) : []), [reference, draft]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map(s => [s, 0])) as Record<ParameterStatus, number>;
    for (const cmp of comparisons) c[cmp.status]++;
    return c;
  }, [comparisons]);

  const scored = comparisons.filter(c => c.status !== 'NOT_APPLICABLE');
  const passing = scored.filter(c => c.status === 'EXACT' || c.status === 'ACCEPTED_RANGE').length;
  const score = scored.length ? passing / scored.length : 0;
  const scoreColor = score >= 0.9 ? 'var(--ok)' : score >= 0.6 ? 'var(--warn)' : 'var(--error)';

  if (!reference) {
    return (
      <div className="page">
        <p className="notice notice--warn">
          <CircleAlert size={16} aria-hidden="true" />
          No hay protocolo de referencia en la base de conocimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Entrenamiento</p>
        <h1 className="page__title">Evaluación del protocolo</h1>
        <p className="page__lead">
          Tu borrador actual se compara parámetro a parámetro con el protocolo de referencia del ensayo{' '}
          <strong>{demoAssay?.assay.nombre}</strong>, aplicando las tolerancias por defecto.
        </p>
      </div>

      <div className="eval-grid">
        <section className="card eval-score" aria-labelledby="score-title">
          <h2 id="score-title" className="sr-only">
            Puntuación
          </h2>
          <ProgressRing fraction={score} color={scoreColor}>
            <span className="lcd__temp mono">
              {passing}
              <small>/{scored.length}</small>
            </span>
            <span className="lcd__temp-label">Parámetros OK</span>
          </ProgressRing>

          <ul className="status-legend">
            {STATUS_ORDER.filter(s => counts[s] > 0).map(s => (
              <li key={s}>
                <span className={`badge badge--${s.toLowerCase()}`}>{STATUS_LABELS[s]}</span>
                <span className="mono">{counts[s]}</span>
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn--ghost btn--block" onClick={() => onLoadProtocol(reference)}>
            Cargar referencia en el editor
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>

        <section className="card eval-table-card" aria-labelledby="eval-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2 id="eval-title" className="card__title">
                Comparación parámetro a parámetro
              </h2>
            </div>
          </header>
          <div className="table-wrap">
            <table className="eval-table">
              <thead>
                <tr>
                  <th scope="col">Parámetro</th>
                  <th scope="col">Tu valor</th>
                  <th scope="col">Referencia</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Observación</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className={`row--${c.status.toLowerCase()}`}>
                    <td className="mono">{c.name}</td>
                    <td className="mono">{formatValue(c.userValue)}</td>
                    <td className="mono">
                      {c.expectedRange
                        ? `${c.expectedRange.min}–${c.expectedRange.max}`
                        : formatValue(c.expectedValue)}
                    </td>
                    <td>
                      <span className={`badge badge--${c.status.toLowerCase()}`}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td className="eval-table__msg">{c.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
