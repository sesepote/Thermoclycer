import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

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

export function NumberField({ label, value, unit, step = 1, min, max, disabled, onChange }: NumberFieldProps) {
  const id = useId();

  const clamp = (n: number) => {
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return Math.round(next * 100) / 100;
  };

  return (
    <div className="nfield">
      <label htmlFor={id} className="nfield__label">
        {label}
      </label>
      <div className="nfield__control">
        <button
          type="button"
          className="nfield__btn"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled}
          aria-label={`Disminuir ${label}`}
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="nfield__input"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        />
        {unit && <span className="nfield__unit">{unit}</span>}
        <button
          type="button"
          className="nfield__btn"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled}
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
