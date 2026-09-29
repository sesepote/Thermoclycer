import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { usePressRepeat } from '../hooks/usePressRepeat';

interface NumberFieldProps {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

// Campo numérico con botones −/+ grandes para uso táctil: mantener
// pulsado repite y acelera. El input sigue admitiendo teclear el valor.
export function NumberField({ label, value, unit, step = 1, min = -Infinity, max = Infinity, disabled = false, onChange }: NumberFieldProps) {
  const id = useId();
  const current = Number.isFinite(value) ? value : 0;
  const nudge = (delta: number) => onChange(Math.round(Math.min(max, Math.max(min, current + delta)) * 100) / 100);

  const minus = usePressRepeat(() => nudge(-step), disabled || current <= min);
  const plus = usePressRepeat(() => nudge(step), disabled || current >= max);

  return (
    <div className="nfield">
      <label htmlFor={id} className="nfield__label">
        {label}
      </label>
      <div className="nfield__control">
        <button type="button" className="nfield__btn" disabled={disabled || current <= min} aria-label={`Disminuir ${label}`} {...minus}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode={Number.isInteger(step) && min >= 0 ? 'numeric' : 'decimal'}
          enterKeyHint="done"
          className="nfield__input"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={Number.isFinite(min) ? min : undefined}
          max={Number.isFinite(max) ? max : undefined}
          disabled={disabled}
          onFocus={e => e.target.select()}
          onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        />
        {unit && <span className="nfield__unit">{unit}</span>}
        <button type="button" className="nfield__btn" disabled={disabled || current >= max} aria-label={`Aumentar ${label}`} {...plus}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
