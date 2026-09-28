import { useMemo } from 'react';
import { CircleAlert, CircleCheck, Plus, Repeat, Save } from 'lucide-react';
import { calculateTotalRuntime, validateProtocol } from '@thermocycler/core';
import { EditorState, EditorStep, PROTOCOL_PRESETS, buildProtocol, newStepId } from '../lib/editorState';
import { formatDuration, temperatureColor } from '../lib/format';
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

interface PhaseBlockProps {
  title: string;
  temperature?: number;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  disabled: boolean;
  children: React.ReactNode;
}

function PhaseBlock({ title, temperature, enabled = true, onToggle, disabled, children }: PhaseBlockProps) {
  return (
    <section
      className={`phase ${enabled ? '' : 'phase--off'}`}
      style={{ '--phase-color': temperatureColor(temperature) } as React.CSSProperties}
    >
      <header className="phase__head">
        <h3 className="phase__title">{title}</h3>
        {onToggle && (
          <label className="switch">
            <input type="checkbox" checked={enabled} disabled={disabled} onChange={e => onToggle(e.target.checked)} />
            <span className="switch__track" aria-hidden="true" />
            <span className="sr-only">Incluir {title}</span>
          </label>
        )}
      </header>
      {enabled && <div className="phase__body">{children}</div>}
    </section>
  );
}

export function ProtocolEditor({ state, onChange, onSave, isDirty, locked, validationError }: ProtocolEditorProps) {
  const protocol = useMemo(() => buildProtocol(state), [state]);
  const validation = useMemo(() => validateProtocol(protocol), [protocol]);
  const runtime = useMemo(() => calculateTotalRuntime(protocol), [protocol]);
  const cycleSeconds = state.steps.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => onChange({ ...state, [key]: value });

  const updateStep = (id: string, next: EditorStep) =>
    set(
      'steps',
      state.steps.map(s => (s.id === id ? next : s)),
    );

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= state.steps.length) return;
    const steps = [...state.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    set('steps', steps);
  };

  const duplicateStep = (index: number) => {
    const steps = [...state.steps];
    steps.splice(index + 1, 0, { ...steps[index], id: newStepId() });
    set('steps', steps);
  };

  const addStep = () =>
    set('steps', [...state.steps, { id: newStepId(), type: 'custom', label: '', temperature: 65, durationSeconds: 30 }]);

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
            <span className="stat__value">{formatDuration(cycleSeconds)}</span>
          </div>
        </div>
      </header>

      <div className="presets" role="group" aria-label="Plantillas de protocolo">
        {PROTOCOL_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className="preset"
            disabled={locked}
            onClick={() => onChange(preset.build())}
          >
            <span className="preset__name">{preset.name}</span>
            <span className="preset__desc">{preset.description}</span>
          </button>
        ))}
      </div>

      <div className="editor__phases">
        <PhaseBlock
          title="Desnaturalización inicial"
          temperature={state.initialTemperature}
          enabled={state.includeInitial}
          onToggle={v => set('includeInitial', v)}
          disabled={locked}
        >
          <div className="field-row">
            <NumberField
              label="Temperatura"
              unit="°C"
              step={0.5}
              min={0}
              max={110}
              value={state.initialTemperature}
              disabled={locked}
              onChange={v => set('initialTemperature', v)}
            />
            <NumberField
              label="Duración"
              unit="s"
              step={15}
              min={1}
              value={state.initialDuration}
              disabled={locked}
              onChange={v => set('initialDuration', v)}
            />
          </div>
        </PhaseBlock>

        <section className="phase phase--cycles">
          <header className="phase__head">
            <h3 className="phase__title">
              <Repeat size={16} aria-hidden="true" />
              Ciclado
            </h3>
            <div className="cycles-count">
              <NumberField
                label="Ciclos"
                value={state.cycleCount}
                min={1}
                max={99}
                disabled={locked}
                onChange={v => set('cycleCount', Math.round(v))}
              />
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
                onChange={next => updateStep(step.id, next)}
                onMove={dir => moveStep(i, dir)}
                onDuplicate={() => duplicateStep(i)}
                onRemove={() => set(
                  'steps',
                  state.steps.filter(s => s.id !== step.id),
                )}
              />
            ))}
          </ol>
          <button type="button" className="btn btn--ghost btn--block" onClick={addStep} disabled={locked}>
            <Plus size={16} aria-hidden="true" />
            Añadir paso
          </button>
        </section>

        <PhaseBlock
          title="Extensión final"
          temperature={state.finalExtensionTemperature}
          enabled={state.includeFinalExtension}
          onToggle={v => set('includeFinalExtension', v)}
          disabled={locked}
        >
          <div className="field-row">
            <NumberField
              label="Temperatura"
              unit="°C"
              step={0.5}
              min={0}
              max={110}
              value={state.finalExtensionTemperature}
              disabled={locked}
              onChange={v => set('finalExtensionTemperature', v)}
            />
            <NumberField
              label="Duración"
              unit="s"
              step={30}
              min={1}
              value={state.finalExtensionDuration}
              disabled={locked}
              onChange={v => set('finalExtensionDuration', v)}
            />
          </div>
        </PhaseBlock>

        <PhaseBlock
          title="Mantenimiento (hold)"
          temperature={state.holdTemperature}
          enabled={state.includeHold}
          onToggle={v => set('includeHold', v)}
          disabled={locked}
        >
          <div className="field-row">
            <NumberField
              label="Temperatura"
              unit="°C"
              step={1}
              min={-20}
              max={30}
              value={state.holdTemperature}
              disabled={locked}
              onChange={v => set('holdTemperature', v)}
            />
          </div>
        </PhaseBlock>
      </div>

      <JsonTools protocol={protocol} disabled={locked} onImport={onChange} />

      <footer className="editor__footer">
        {validation.valid && !validationError ? (
          <p className="validation validation--ok">
            <CircleCheck size={16} aria-hidden="true" />
            Protocolo válido
          </p>
        ) : (
          <ul className="validation validation--error" aria-live="polite">
            {validationError && (
              <li>
                <CircleAlert size={16} aria-hidden="true" />
                {validationError}
              </li>
            )}
            {validation.issues.map(issue => (
              <li key={`${issue.code}-${issue.path ?? ''}`}>
                <CircleAlert size={16} aria-hidden="true" />
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn btn--primary" onClick={onSave} disabled={locked || !validation.valid}>
          <Save size={16} aria-hidden="true" />
          {isDirty ? 'Cargar en el termociclador' : 'Programa cargado'}
        </button>
      </footer>
    </section>
  );
}
