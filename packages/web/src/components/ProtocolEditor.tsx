import { ReactNode, memo, useMemo } from 'react';
import { CircleAlert, CircleCheck, Plus, Repeat, Save } from 'lucide-react';
import { calculateTotalRuntime, cycleDuration, validateProtocol } from '@thermocycler/core';
import { EditorPhase, EditorState, EditorStep, PROTOCOL_PRESETS, PhaseKey, buildProtocol, newStepId } from '../lib/editorState';
import { cssVars, formatDuration, temperatureColor } from '../lib/format';
import { NumberField } from './NumberField';
import { StepRow } from './StepRow';
import { JsonTools } from './JsonTools';

interface ProtocolEditorProps {
  state: EditorState;
  onChange: (next: EditorState) => void;
  onSave: () => void;
  isDirty: boolean;
  locked: boolean;
  validationError?: string;
}

// Configuración de las fases opcionales. Una fase nueva del mismo tipo
// (temperatura + duración opcional) se añade con una entrada más.
interface PhaseConfig {
  key: PhaseKey;
  title: string;
  temp: { min: number; max: number; step: number };
  durationStep?: number; // sin duración: el hold se mantiene indefinidamente
}

const BEFORE_CYCLES: PhaseConfig[] = [
  { key: 'initial', title: 'Desnaturalización inicial', temp: { min: 0, max: 110, step: 0.5 }, durationStep: 15 },
];
const AFTER_CYCLES: PhaseConfig[] = [
  { key: 'finalExtension', title: 'Extensión final', temp: { min: 0, max: 110, step: 0.5 }, durationStep: 30 },
  { key: 'hold', title: 'Mantenimiento (hold)', temp: { min: -20, max: 30, step: 1 } },
];

/* ---------- Bloque de una fase opcional (con interruptor) ---------- */

interface PhaseBlockProps {
  config: PhaseConfig;
  phase: EditorPhase;
  disabled: boolean;
  onChange: (next: EditorPhase) => void;
}

function PhaseBlock({ config: { title, temp, durationStep }, phase, disabled, onChange }: PhaseBlockProps) {
  return (
    <section className={`phase ${phase.enabled ? '' : 'phase--off'}`} style={cssVars({ '--phase-color': temperatureColor(phase.temperature) })}>
      <header className="phase__head">
        <h3 className="phase__title">{title}</h3>
        <label className="switch">
          <input type="checkbox" checked={phase.enabled} disabled={disabled} onChange={e => onChange({ ...phase, enabled: e.target.checked })} />
          <span className="switch__track" aria-hidden="true" />
          <span className="sr-only">Incluir {title}</span>
        </label>
      </header>
      {phase.enabled && (
        <div className="phase__body field-row">
          <NumberField label="Temperatura" unit="°C" {...temp} value={phase.temperature} disabled={disabled} onChange={temperature => onChange({ ...phase, temperature })} />
          {durationStep && (
            <NumberField label="Duración" unit="s" step={durationStep} min={1} value={phase.durationSeconds} disabled={disabled} onChange={durationSeconds => onChange({ ...phase, durationSeconds })} />
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Editor completo ---------- */

// memo: el editor es la parte más pesada del formulario y no debe
// re-renderizarse por cambios ajenos (p. ej. el reloj de la simulación).
export const ProtocolEditor = memo(function ProtocolEditor({ state, onChange, onSave, isDirty, locked, validationError }: ProtocolEditorProps) {
  const protocol = useMemo(() => buildProtocol(state), [state]);
  const validation = useMemo(() => validateProtocol(protocol), [protocol]);
  const runtime = useMemo(() => calculateTotalRuntime(protocol), [protocol]);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => onChange({ ...state, [key]: value });
  const setSteps = (steps: EditorStep[]) => set('steps', steps);

  // Operaciones sobre la lista de pasos del ciclo.
  const stepOps = {
    update: (id: string, next: EditorStep) => setSteps(state.steps.map(s => (s.id === id ? next : s))),
    remove: (id: string) => setSteps(state.steps.filter(s => s.id !== id)),
    move(index: number, dir: -1 | 1) {
      const steps = [...state.steps];
      [steps[index], steps[index + dir]] = [steps[index + dir], steps[index]];
      setSteps(steps);
    },
    duplicate(index: number) {
      const steps = [...state.steps];
      steps.splice(index + 1, 0, { ...steps[index], id: newStepId() });
      setSteps(steps);
    },
    add: () => setSteps([...state.steps, { id: newStepId(), type: 'custom', label: '', temperature: 65, durationSeconds: 30 }]),
  };

  const renderPhases = (list: PhaseConfig[]): ReactNode =>
    list.map(config => <PhaseBlock key={config.key} config={config} phase={state[config.key]} disabled={locked} onChange={p => set(config.key, p)} />);

  return (
    <section className="card editor" aria-labelledby="editor-title">
      <header className="card__head">
        <div>
          <p className="eyebrow">Programa</p>
          <h2 id="editor-title" className="card__title">
            Editor de protocolo
          </h2>
        </div>
        <div className="editor__stats">
          <div className="stat">
            <span className="stat__label">Duración total</span>
            <span className="stat__value">{runtime.ok ? formatDuration(runtime.result.value) : '—'}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Por ciclo</span>
            <span className="stat__value">{formatDuration(cycleDuration(protocol) || 0)}</span>
          </div>
        </div>
      </header>

      {/* Plantillas */}
      <div className="presets" role="group" aria-label="Plantillas de protocolo">
        {PROTOCOL_PRESETS.map(preset => (
          <button key={preset.id} type="button" className="preset" disabled={locked} onClick={() => onChange(preset.build())}>
            <span className="preset__name">{preset.name}</span>
            <span className="preset__desc">{preset.description}</span>
          </button>
        ))}
      </div>

      {/* Fases en orden de ejecución */}
      <div className="editor__phases">
        {renderPhases(BEFORE_CYCLES)}

        <section className="phase phase--cycles">
          <header className="phase__head">
            <h3 className="phase__title">
              <Repeat size={16} aria-hidden="true" />
              Ciclado
            </h3>
            <div className="cycles-count">
              <NumberField label="Ciclos" value={state.cycleCount} min={1} max={99} disabled={locked} onChange={v => set('cycleCount', Math.round(v))} />
            </div>
          </header>
          <ol className="steps">
            {state.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                total={state.steps.length}
                disabled={locked}
                onChange={next => stepOps.update(step.id, next)}
                onMove={dir => stepOps.move(i, dir)}
                onDuplicate={() => stepOps.duplicate(i)}
                onRemove={() => stepOps.remove(step.id)}
              />
            ))}
          </ol>
          <button type="button" className="btn btn--ghost btn--block" onClick={stepOps.add} disabled={locked}>
            <Plus size={16} aria-hidden="true" />
            Añadir paso
          </button>
        </section>

        {renderPhases(AFTER_CYCLES)}
      </div>

      <JsonTools protocol={protocol} disabled={locked} onImport={onChange} />

      {/* Validación + carga en el equipo */}
      <footer className="editor__footer">
        {validation.valid && !validationError ? (
          <p className="validation validation--ok">
            <CircleCheck size={16} aria-hidden="true" />
            Protocolo válido
          </p>
        ) : (
          <ul className="validation validation--error" aria-live="polite">
            {[validationError, ...validation.issues.map(i => i.message)].filter(Boolean).map((message, i) => (
              <li key={i}>
                <CircleAlert size={16} aria-hidden="true" />
                {message}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn btn--primary btn--lg" onClick={onSave} disabled={locked || !validation.valid}>
          <Save size={16} aria-hidden="true" />
          {isDirty ? 'Cargar en el termociclador' : 'Programa cargado'}
        </button>
      </footer>
    </section>
  );
});
