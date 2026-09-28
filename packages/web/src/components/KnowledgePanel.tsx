import { useMemo } from 'react';
import { Beaker, CircleCheck, CircleX, Cpu, FlaskConical, Workflow, Zap } from 'lucide-react';
import { RuleEngine, calculateAnnealingTemperatureRange } from '@thermocycler/core';
import { calculationResolver, demoAssay, knowledgeBase } from '../lib/knowledge';

const ruleEngine = new RuleEngine();

interface EntityCardProps {
  icon: typeof Beaker;
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
      {tags && tags.length > 0 && (
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

export function KnowledgePanel({ annealingTemperature }: { annealingTemperature?: number }) {
  const c = demoAssay;
  const compatible =
    c?.polymerase && c?.buffer ? knowledgeBase.isPolymeraseBufferCompatible(c.polymerase.id, c.buffer.id) : false;

  const engineResult = useMemo(() => {
    if (!c?.polymerase || !c.primerForward || !c.primerReverse) return null;
    const range = calculateAnnealingTemperatureRange(c.primerForward, c.primerReverse);
    const context = {
      polymerase: { id: c.polymerase.id },
      primerPair: { compatible: true, forward: c.primerForward.id, reverse: c.primerReverse.id },
      userInput: { annealingTemperature: annealingTemperature ?? 60 },
      expectedRange: range.ok ? { min: range.result.value.min, max: range.result.value.max } : { min: 58, max: 62 },
    };
    const { facts, trace } = ruleEngine.run(knowledgeBase.activeRules(), context);
    return { trace, facts: calculationResolver.resolve(facts, knowledgeBase) };
  }, [c, annealingTemperature]);

  const firedIds = new Set(engineResult?.trace.map(t => t.ruleId));
  const rules = knowledgeBase.activeRules();

  return (
    <div className="page">
      <div className="page__intro">
        <p className="eyebrow">Base de conocimiento · v{knowledgeBase.version}</p>
        <h1 className="page__title">{c?.assay.nombre ?? 'Ensayo'}</h1>
        <p className="page__lead">
          {c?.assay.tipoDePCR && <span className="tag">{c.assay.tipoDePCR}</span>} {c?.assay.objetivo}
        </p>
      </div>

      <div className="entity-grid">
        <EntityCard
          icon={Zap}
          kind="Polimerasa"
          name={c?.polymerase?.nombre}
          rows={[
            ['Tipo', c?.polymerase?.tipo],
            ['Fabricante', c?.polymerase?.fabricante],
            [
              'Temp. extensión',
              c?.polymerase?.temperaturaRecomendada ? `${c.polymerase.temperaturaRecomendada.value} °C` : undefined,
            ],
            [
              'Rango',
              c?.polymerase?.rangoTemperatura
                ? `${c.polymerase.rangoTemperatura.min}–${c.polymerase.rangoTemperatura.max} °C`
                : undefined,
            ],
            [
              'Velocidad',
              c?.polymerase?.velocidadExtension ? `${c.polymerase.velocidadExtension.value} s/kb` : undefined,
            ],
          ]}
          tags={c?.polymerase?.requisitos}
        />
        <EntityCard
          icon={FlaskConical}
          kind="Buffer"
          name={c?.buffer?.nombre}
          rows={[
            ['Concentración', c?.buffer?.concentracion],
            ...Object.entries(c?.buffer?.composicion ?? {}).map(([k, v]) => [k, v] as [string, string]),
          ]}
        />
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
            Relación verificada en el grafo de conocimiento entre {c?.polymerase?.nombre} y {c?.buffer?.nombre}.
          </p>
        </article>
      </div>

      <div className="rules-grid">
        <section className="card" aria-labelledby="rules-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Motor de reglas</p>
              <h2 id="rules-title" className="card__title">
                <Workflow size={18} aria-hidden="true" /> Reglas activas
              </h2>
            </div>
            <span className="tag">
              {engineResult?.trace.length ?? 0}/{rules.length} disparadas
            </span>
          </header>
          <p className="muted small">
            Evaluadas con tu temperatura de hibridación actual:{' '}
            <strong className="mono">{annealingTemperature ?? 60} °C</strong>
          </p>
          <ol className="rules">
            {rules
              .slice()
              .sort((a, b) => b.prioridad - a.prioridad)
              .map(rule => {
                const fired = firedIds.has(rule.id);
                return (
                  <li key={rule.id} className={`rule ${fired ? 'rule--fired' : ''}`}>
                    <span className="rule__status" aria-hidden="true" />
                    <div className="rule__body">
                      <p className="rule__name">{rule.nombre}</p>
                      {rule.descripcion && <p className="rule__desc">{rule.descripcion}</p>}
                      <p className="rule__meta mono">
                        {rule.id} · prioridad {rule.prioridad} · v{rule.version}
                        {rule.fuente ? ` · ${rule.fuente}` : ''}
                      </p>
                    </div>
                    <span className={`badge ${fired ? 'badge--exact' : 'badge--not_applicable'}`}>
                      {fired ? 'Disparada' : 'No aplica'}
                    </span>
                  </li>
                );
              })}
          </ol>
        </section>

        <section className="card" aria-labelledby="facts-title">
          <header className="card__head">
            <div>
              <p className="eyebrow">Motor de cálculo</p>
              <h2 id="facts-title" className="card__title">
                <Cpu size={18} aria-hidden="true" /> Hechos resueltos
              </h2>
            </div>
          </header>
          <pre className="facts mono">{JSON.stringify(engineResult?.facts ?? {}, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
