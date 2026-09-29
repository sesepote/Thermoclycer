import { useMemo } from 'react';
import { Beaker, CircleCheck, CircleX, Cpu, FlaskConical, LucideIcon, Workflow, Zap } from 'lucide-react';
import { RuleEngine, calculateAnnealingTemperatureRange } from '@thermocycler/core';
import { calculationResolver, demoAssay as c, knowledgeBase } from '../lib/knowledge';
import { useApp } from '../state/app';

const ruleEngine = new RuleEngine();
const FALLBACK_ANNEALING = 60;
const FALLBACK_RANGE = { min: 58, max: 62 };

// Reglas en orden de ejecución (constantes durante la sesión).
const RULES = knowledgeBase.activeRules().sort((a, b) => b.prioridad - a.prioridad);

/* ---------- Tarjeta genérica de entidad ---------- */

interface EntityCardProps {
  icon: LucideIcon;
  kind: string;
  name?: string;
  rows: [string, string | undefined][];
  tags?: string[];
}

function EntityCard({ icon: Icon, kind, name, rows, tags }: EntityCardProps) {
  return (
    <article className="card entity">
      <div className="entity__icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <p className="eyebrow">{kind}</p>
      <h3 className="entity__name">{name ?? '—'}</h3>
      <dl className="entity__rows">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {!!tags?.length && (
        <div className="entity__tags">
          {tags.map(t => (
            <span key={t} className="tag tag--muted">
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

/* ---------- Vista: entidades del ensayo + motores de reglas y cálculo ---------- */

export default function KnowledgeView() {
  const { annealingTemperature = FALLBACK_ANNEALING } = useApp();
  const poly = c?.polymerase;
  const buffer = c?.buffer;
  const compatible = poly && buffer ? knowledgeBase.isPolymeraseBufferCompatible(poly.id, buffer.id) : false;

  // Ejecuta las reglas con la temperatura de hibridación actual del
  // editor y resuelve después los cálculos pendientes que dejan.
  const engine = useMemo(() => {
    if (!poly || !c?.primerForward || !c.primerReverse) return null;
    const range = calculateAnnealingTemperatureRange(c.primerForward, c.primerReverse);
    const { facts, trace } = ruleEngine.run(RULES, {
      polymerase: { id: poly.id },
      primerPair: { compatible: true, forward: c.primerForward.id, reverse: c.primerReverse.id },
      userInput: { annealingTemperature },
      expectedRange: range.ok ? { min: range.result.value.min, max: range.result.value.max } : FALLBACK_RANGE,
    });
    return { fired: new Set(trace.map(t => t.ruleId)), facts: calculationResolver.resolve(facts, knowledgeBase) };
  }, [poly, annealingTemperature]);

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Base de conocimiento · v{knowledgeBase.version}</p>
        <h1 className="page__title">{c?.assay.nombre ?? 'Ensayo'}</h1>
        <p className="page__lead">
          {c?.assay.tipoDePCR && <span className="tag">{c.assay.tipoDePCR}</span>} {c?.assay.objetivo}
        </p>
      </div>

      {/* Entidades */}
      <div className="entity-grid">
        <EntityCard
          icon={Zap}
          kind="Polimerasa"
          name={poly?.nombre}
          rows={[
            ['Tipo', poly?.tipo],
            ['Fabricante', poly?.fabricante],
            ['Temp. extensión', poly?.temperaturaRecomendada && `${poly.temperaturaRecomendada.value} °C`],
            ['Rango', poly?.rangoTemperatura && `${poly.rangoTemperatura.min}–${poly.rangoTemperatura.max} °C`],
            ['Velocidad', poly?.velocidadExtension && `${poly.velocidadExtension.value} s/kb`],
          ]}
          tags={poly?.requisitos}
        />
        <EntityCard icon={FlaskConical} kind="Buffer" name={buffer?.nombre} rows={[['Concentración', buffer?.concentracion], ...Object.entries(buffer?.composicion ?? {})]} />
        <EntityCard
          icon={Beaker}
          kind="Química"
          name={c?.chemistry?.nombre}
          rows={[
            ['Tipo', c?.chemistry?.tipo],
            ['Descripción', c?.chemistry?.descripcion],
          ]}
          tags={c?.chemistry?.componentes}
        />
        <article className={`card entity entity--compat ${compatible ? 'is-ok' : 'is-bad'}`}>
          <div className="entity__icon" aria-hidden="true">
            {compatible ? <CircleCheck size={18} /> : <CircleX size={18} />}
          </div>
          <p className="eyebrow">Compatibilidad</p>
          <h3 className="entity__name">{compatible ? 'Polimerasa y buffer compatibles' : 'Combinación no compatible'}</h3>
          <p className="entity__note">
            Relación verificada en el grafo de conocimiento entre {poly?.nombre} y {buffer?.nombre}.
          </p>
        </article>
      </div>

      <div className="rules-grid">
        {/* Motor de reglas */}
        <section className="card" aria-labelledby="rules-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Motor de reglas</p>
              <h2 id="rules-title" className="card__title">
                <Workflow size={18} aria-hidden="true" /> Reglas activas
              </h2>
            </div>
            <span className="tag">
              {engine?.fired.size ?? 0}/{RULES.length} disparadas
            </span>
          </header>
          <p className="muted small">
            Evaluadas con tu temperatura de hibridación actual: <strong className="mono">{annealingTemperature} °C</strong>
          </p>
          <ol className="rules">
            {RULES.map(rule => {
              const fired = engine?.fired.has(rule.id);
              return (
                <li key={rule.id} className={`rule ${fired ? 'rule--fired' : ''}`}>
                  <span className="rule__status" aria-hidden="true" />
                  <div className="rule__body">
                    <p className="rule__name">{rule.nombre}</p>
                    {rule.descripcion && <p className="rule__desc">{rule.descripcion}</p>}
                    <p className="rule__meta mono">
                      {rule.id} · prioridad {rule.prioridad} · v{rule.version}
                      {rule.fuente && ` · ${rule.fuente}`}
                    </p>
                  </div>
                  <span className={`badge ${fired ? 'badge--exact' : 'badge--not_applicable'}`}>{fired ? 'Disparada' : 'No aplica'}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Motor de cálculo */}
        <section className="card" aria-labelledby="facts-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Motor de cálculo</p>
              <h2 id="facts-title" className="card__title">
                <Cpu size={18} aria-hidden="true" /> Hechos resueltos
              </h2>
            </div>
          </header>
          <pre className="facts mono" data-no-swipe>
            {JSON.stringify(engine?.facts ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
