import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { StepType } from '@thermocycler/core';
import { EditorStep } from '../lib/editorState';
import { temperatureColor } from '../lib/format';
import { NumberField } from './NumberField';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  denaturation: 'Desnaturalización',
  annealing: 'Hibridación',
  extension: 'Extensión',
  custom: 'Personalizado',
};

interface StepRowProps {
  step: EditorStep;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (step: EditorStep) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function StepRow({ step, index, total, disabled, onChange, onMove, onDuplicate, onRemove }: StepRowProps) {
  const color = temperatureColor(step.temperature);

  return (
    <li className="step" style={{ '--step-color': color } as React.CSSProperties}>
      <div className="step__index" aria-hidden="true">
        {index + 1}
      </div>

      <div className="step__body">
        <div className="step__head">
          <label className="sr-only" htmlFor={`type-${step.id}`}>
            Tipo de paso {index + 1}
          </label>
          <select
            id={`type-${step.id}`}
            className="step__type"
            value={step.type}
            disabled={disabled}
            onChange={e => onChange({ ...step, type: e.target.value as StepType })}
          >
            {(Object.keys(STEP_TYPE_LABELS) as StepType[]).map(t => (
              <option key={t} value={t}>
                {STEP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {step.type === 'custom' && (
            <input
              className="step__label-input"
              placeholder="Nombre del paso"
              aria-label="Nombre del paso personalizado"
              value={step.label ?? ''}
              disabled={disabled}
              onChange={e => onChange({ ...step, label: e.target.value })}
            />
          )}

          <div className="step__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => onMove(-1)}
              disabled={disabled || index === 0}
              aria-label="Subir paso"
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onMove(1)}
              disabled={disabled || index === total - 1}
              aria-label="Bajar paso"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn" onClick={onDuplicate} disabled={disabled} aria-label="Duplicar paso">
              <Copy size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              onClick={onRemove}
              disabled={disabled || total <= 1}
              aria-label="Eliminar paso"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="step__fields">
          <NumberField
            label="Temperatura"
            unit="°C"
            value={step.temperature}
            step={0.5}
            min={0}
            max={110}
            disabled={disabled}
            onChange={temperature => onChange({ ...step, temperature })}
          />
          <NumberField
            label="Duración"
            unit="s"
            value={step.durationSeconds}
            step={5}
            min={1}
            disabled={disabled}
            onChange={durationSeconds => onChange({ ...step, durationSeconds })}
          />
        </div>
      </div>
    </li>
  );
}
