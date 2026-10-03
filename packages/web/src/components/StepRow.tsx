import { ChevronDown, ChevronUp, Copy, LucideIcon, Trash2 } from 'lucide-react';
import { StepType } from '@thermocycler/core';
import { EditorStep } from '../lib/editorState';
import { cssVars, temperatureColor } from '../lib/format';
import { STEP_TYPE_LABELS } from '../lib/labels';
import { NumberField } from './NumberField';

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

// Un paso del ciclo: tipo, nombre (si es personalizado), temperatura,
// duración y acciones (subir, bajar, duplicar, eliminar).
export function StepRow({ step, index, total, disabled, onChange, onMove, onDuplicate, onRemove }: StepRowProps) {
  const actions: { label: string; icon: LucideIcon; onClick: () => void; off: boolean; danger?: boolean }[] = [
    { label: 'Subir paso', icon: ChevronUp, onClick: () => onMove(-1), off: index === 0 },
    { label: 'Bajar paso', icon: ChevronDown, onClick: () => onMove(1), off: index === total - 1 },
    { label: 'Duplicar paso', icon: Copy, onClick: onDuplicate, off: false },
    { label: 'Eliminar paso', icon: Trash2, onClick: onRemove, off: total <= 1, danger: true },
  ];

  return (
    <li className="step" style={cssVars({ '--step-color': temperatureColor(step.temperature) })}>
      <div className="step__index" aria-hidden="true">
        {index + 1}
      </div>

      <div className="step__body">
        <div className="step__head">
          <select
            className="step__type"
            aria-label={`Tipo de paso ${index + 1}`}
            value={step.type}
            disabled={disabled}
            onChange={e => onChange({ ...step, type: e.target.value as StepType })}
          >
            {Object.entries(STEP_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
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
            {actions.map(({ label, icon: Icon, onClick, off, danger }) => (
              <button key={label} type="button" className={`icon-btn ${danger ? 'icon-btn--danger' : ''}`} onClick={onClick} disabled={disabled || off} aria-label={label}>
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="step__fields">
          <NumberField label="Temperatura" unit="°C" value={step.temperature} step={0.5} min={0} max={110} disabled={disabled} onChange={temperature => onChange({ ...step, temperature })} />
          <NumberField label="Duración" unit="s" value={step.durationSeconds} step={5} min={1} disabled={disabled} onChange={durationSeconds => onChange({ ...step, durationSeconds })} />
        </div>
      </div>
    </li>
  );
}
