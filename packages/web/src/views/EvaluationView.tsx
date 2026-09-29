import { useMemo } from 'react';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { ParameterStatus, compareProtocols } from '@thermocycler/core';
import { demoAssay } from '../lib/knowledge';
import { ProgressRing } from '../components/ProgressRing';
import { useApp } from '../state/app';

const STATUS_LABELS: Record<ParameterStatus, string> = {
  EXACT: 'Exacto',
  ACCEPTED_RANGE: 'Aceptable',
  OUT_OF_RANGE: 'Fuera de rango',
  MISSING: 'Falta',
  INVALID: 'Inválido',
  NOT_APPLICABLE: 'No aplica',
};

const STATUS_ORDER = Object.keys(STATUS_LABELS) as ParameterStatus[];
const PASSING = new Set<ParameterStatus>(['EXACT', 'ACCEPTED_RANGE']);
const COLUMNS = ['Parámetro', 'Tu valor', 'Referencia', 'Estado', 'Observación'];

const show = (value?: number) => (value === undefined ? '—' : String(value));

// Compara el borrador del editor con el protocolo de referencia del
// ensayo, parámetro a parámetro, y resume cuántos pasan.
export default function EvaluationView() {
  const { draft, loadProtocol } = useApp();
  const reference = demoAssay?.referenceProtocol;

  const { comparisons, counts, passing, scored } = useMemo(() => {
    const comparisons = reference ? compareProtocols(reference, draft) : [];
    const counts = new Map<ParameterStatus, number>();
    for (const c of comparisons) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    const scored = comparisons.length - (counts.get('NOT_APPLICABLE') ?? 0);
    const passing = comparisons.filter(c => PASSING.has(c.status)).length;
    return { comparisons, counts, passing, scored };
  }, [reference, draft]);

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

  const score = scored ? passing / scored : 0;
  const scoreColor = score >= 0.9 ? 'var(--ok)' : score >= 0.6 ? 'var(--warn)' : 'var(--error)';

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Entrenamiento</p>
        <h1 className="page__title">Evaluación del protocolo</h1>
        <p className="page__lead">
          Tu borrador actual se compara parámetro a parámetro con el protocolo de referencia del ensayo <strong>{demoAssay?.assay.nombre}</strong>, aplicando
          las tolerancias por defecto.
        </p>
      </div>

      <div className="eval-grid">
        {/* Resumen */}
        <section className="card eval-score" aria-label="Puntuación">
          <ProgressRing fraction={score} color={scoreColor} label="Parámetros correctos">
            <span className="lcd__temp mono">
              {passing}
              <small>/{scored}</small>
            </span>
            <span className="lcd__temp-label">Parámetros OK</span>
          </ProgressRing>

          <ul className="status-legend">
            {STATUS_ORDER.filter(s => counts.has(s)).map(s => (
              <li key={s}>
                <span className={`badge badge--${s.toLowerCase()}`}>{STATUS_LABELS[s]}</span>
                <span className="mono">{counts.get(s)}</span>
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn--ghost btn--block btn--lg" onClick={() => loadProtocol(reference)}>
            Cargar referencia en el editor
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>

        {/* Detalle: tabla en escritorio, tarjetas apiladas en móvil (CSS + data-label) */}
        <section className="card eval-table-card" aria-labelledby="eval-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2 id="eval-title" className="card__title">
                Comparación parámetro a parámetro
              </h2>
            </div>
          </header>
          <div className="table-wrap" data-no-swipe>
            <table className="eval-table">
              <thead>
                <tr>
                  {COLUMNS.map(c => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => {
                  const cells = [
                    show(c.userValue),
                    c.expectedRange ? `${c.expectedRange.min}–${c.expectedRange.max}` : show(c.expectedValue),
                  ];
                  return (
                    <tr key={`${c.name}-${i}`} className={`row--${c.status.toLowerCase()}`}>
                      <td className="mono" data-label={COLUMNS[0]}>
                        {c.name}
                      </td>
                      {cells.map((value, j) => (
                        <td key={j} className="mono" data-label={COLUMNS[j + 1]}>
                          {value}
                        </td>
                      ))}
                      <td data-label={COLUMNS[3]}>
                        <span className={`badge badge--${c.status.toLowerCase()}`}>{STATUS_LABELS[c.status]}</span>
                      </td>
                      <td className="eval-table__msg" data-label={COLUMNS[4]}>
                        {c.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
