import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Modal } from './Modal';
import { playConfirmBeep, playKeyClick } from '../utils/audio';

export type StepAdjustField = 'ramp' | 'tempIncrement' | 'timeIncrement';

const FIELDS: Record<StepAdjustField, { title: string; unit: string; min: number; max: number; step: number; presets: number[] }> = {
  ramp: { title: 'Velocidad de rampa', unit: '°C/s', min: 0.5, max: 6, step: 0.1, presets: [1, 2, 3.5, 4, 5] },
  tempIncrement: { title: 'Incremento de temperatura por ciclo', unit: '°C/ciclo', min: -2, max: 2, step: 0.1, presets: [-1, -0.5, 0, 0.5, 1] },
  timeIncrement: { title: 'Incremento de tiempo por ciclo', unit: 's/ciclo', min: -30, max: 60, step: 1, presets: [-10, -5, 0, 5, 10] },
};

interface StepAdjustModalProps {
  field: StepAdjustField;
  stepName: string;
  stepNumber: number;
  value: number;
  onSave: (value: number) => void;
  onClose: () => void;
}

// Ajuste de lo que no cabe en el teclado de temperatura o de tiempo:
// rampa del paso e incrementos por ciclo (touchdown y PCR larga).
export const StepAdjustModal: React.FC<StepAdjustModalProps> = ({ field, stepName, stepNumber, value, onSave, onClose }) => {
  const spec = FIELDS[field];
  const [current, setCurrent] = useState(value);
  const clamp = (next: number) => Math.min(spec.max, Math.max(spec.min, Number(next.toFixed(1))));
  const confirm = () => {
    playConfirmBeep();
    onSave(clamp(current));
    onClose();
  };

  return (
    <Modal title={spec.title} onClose={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
          <div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">{spec.title}</div>
            <div className="text-sm font-bold text-white">Paso #{stepNumber}: {stepName}</div>
          </div>
          <button type="button" onClick={() => { playKeyClick(); onClose(); }} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <button type="button" className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono" onClick={() => { playKeyClick(); setCurrent(v => clamp(v - spec.step)); }}>−{spec.step}</button>
            <div className="min-w-36 text-center font-mono text-3xl font-bold text-cyan-300 tabular-nums">
              {current > 0 && field !== 'ramp' ? `+${current}` : current}
              <span className="block text-xs text-slate-400 font-sans font-medium">{spec.unit}</span>
            </div>
            <button type="button" className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono" onClick={() => { playKeyClick(); setCurrent(v => clamp(v + spec.step)); }}>+{spec.step}</button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {spec.presets.map(preset => (
              <button key={preset} type="button" className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200" onClick={() => { playKeyClick(); setCurrent(preset); }}>
                {preset > 0 && field !== 'ramp' ? `+${preset}` : preset}
              </button>
            ))}
          </div>
          <button type="button" onClick={confirm} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Aplicar
          </button>
        </div>
      </div>
    </Modal>
  );
};
