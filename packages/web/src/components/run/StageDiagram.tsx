import { memo, useMemo } from 'react';
import { Protocol, SimulationPhase } from '@thermocycler/core';
import { cssVars, formatClock, temperatureColor } from '../../lib/format';
import { STEP_TYPE_LABELS } from '../../lib/labels';
import { useSimulation } from '../../state/simulation';

// Diagrama de etapas al estilo de la pantalla de un termociclador: cada
// paso es una columna con su meseta de temperatura, unidas por rampas,
// agrupadas por etapa (inicial, ciclado ×N, extensión final, hold).
// El SVG y las etiquetas HTML comparten la misma rejilla de columnas.

const MAX_T = 105;
// Posición vertical (% del alto) de una temperatura, con margen para etiquetas.
const yFor = (t: number) => 14 + (1 - Math.min(MAX_T, Math.max(0, t)) / MAX_T) * 66;
const PLATEAU = 0.22; // margen horizontal de la meseta dentro de su columna

interface StageStep {
  phase: SimulationPhase;
  stepIndex?: number;
  temperature: number;
  seconds: number; // Infinity en el hold
  label: string;
}

interface Stage {
  key: string;
  title: string;
  repeat?: number;
  steps: StageStep[];
}

function buildStages({ initial, cycles, finalExtension, hold }: Protocol): Stage[] {
  const stages: Stage[] = [];
  if (initial) stages.push({ key: 'initial', title: 'Inicial', steps: [{ phase: 'initial', ...phaseStep(initial), label: 'Desnat.' }] });
  stages.push({
    key: 'cycle',
    title: 'Ciclado',
    repeat: cycles.count,
    steps: cycles.steps.map((s, i) => ({ phase: 'cycle', stepIndex: i, temperature: s.temperature, seconds: s.durationSeconds, label: s.label || STEP_TYPE_LABELS[s.type] })),
  });
  if (finalExtension) stages.push({ key: 'final', title: 'Ext. final', steps: [{ phase: 'final_extension', ...phaseStep(finalExtension), label: 'Extensión' }] });
  if (hold) stages.push({ key: 'hold', title: 'Hold', steps: [{ phase: 'hold', temperature: hold.temperature, seconds: Infinity, label: 'Conservación' }] });
  return stages;
}

const phaseStep = (p: { temperature: number; durationSeconds: number }) => ({ temperature: p.temperature, seconds: p.durationSeconds });

// Traza de mesetas y rampas en unidades de columna (x) y % (y).
function tracePath(steps: StageStep[]): string {
  return steps.map((s, i) => `${i ? 'L' : 'M'}${i + PLATEAU},${yFor(s.temperature)} L${i + 1 - PLATEAU},${yFor(s.temperature)}`).join(' ');
}

export const StageDiagram = memo(function StageDiagram({ protocol }: { protocol: Protocol }) {
  const stages = useMemo(() => buildStages(protocol), [protocol]);
  const steps = useMemo(() => stages.flatMap(s => s.steps), [stages]);
  const path = useMemo(() => tracePath(steps), [steps]);

  // Solo primitivos: se re-renderiza al cambiar de paso o de ciclo.
  const live = useSimulation(s => s.snapshot.state === 'RUNNING' || s.snapshot.state === 'PAUSED' || s.snapshot.phase === 'hold');
  const phase = useSimulation(s => s.snapshot.phase);
  const stepIndex = useSimulation(s => s.snapshot.stepIndex);
  const cycle = useSimulation(s => s.snapshot.cycleNumber);
  const current = live ? steps.findIndex(s => s.phase === phase && (phase !== 'cycle' || s.stepIndex === stepIndex)) : -1;
  const y = current >= 0 ? yFor(steps[current].temperature) : 0;

  return (
    <div className="stages-scroll">
      <div className="stages" style={cssVars({ '--cols': String(steps.length) })}>
        {stages.map(stage => (
          <div key={stage.key} className={`stages__head ${stage.key === 'cycle' ? 'stages__head--cycle' : ''}`} style={{ gridColumn: `span ${stage.steps.length}` }}>
            <span>{stage.title}</span>
            {stage.repeat !== undefined && <span className="stages__repeat mono">{phase === 'cycle' && live ? `${cycle}/${stage.repeat}` : `×${stage.repeat}`}</span>}
          </div>
        ))}

        <svg className="stages__svg" viewBox={`0 0 ${steps.length} 100`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path} className="stages__line" vectorEffect="non-scaling-stroke" />
          {current >= 0 && (
            <path d={`M${current + PLATEAU},${y} L${current + 1 - PLATEAU},${y}`} className="stages__line stages__line--current" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {steps.map((step, i) => (
          <div
            key={i}
            className={`stage-cell ${i === current ? 'is-current' : ''}`}
            style={{ gridColumn: i + 1, ...cssVars({ '--y': `${yFor(step.temperature)}%`, '--cell-color': temperatureColor(step.temperature, 64) }) }}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="stage-cell__temp mono">{step.temperature}°</span>
            <span className="stage-cell__time mono">{formatClock(step.seconds)}</span>
            <span className="stage-cell__name">{step.label}</span>
            {i === current && Number.isFinite(step.seconds) && <StepProgress seconds={step.seconds} />}
          </div>
        ))}
      </div>
    </div>
  );
});

// Barra de avance del paso actual: único trozo del diagrama que cambia por frame.
function StepProgress({ seconds }: { seconds: number }) {
  const remaining = useSimulation(s => s.snapshot.remainingInPhaseSeconds ?? seconds);
  const fraction = seconds > 0 ? 1 - remaining / seconds : 1;
  return (
    <span className="stage-cell__progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, fraction))})` }} />
    </span>
  );
}
