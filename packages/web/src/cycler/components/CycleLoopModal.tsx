import React, { useState } from 'react';
import { X, Repeat, Check, Plus, Minus } from 'lucide-react';
import { PCRStep, PCRCycleLoop } from '../types/pcr';
import { playKeyClick, playConfirmBeep } from '../utils/audio';

interface CycleLoopModalProps {
  steps: PCRStep[];
  currentLoop?: PCRCycleLoop;
  onSave: (loop: PCRCycleLoop) => void;
  onClose: () => void;
}

export const CycleLoopModal: React.FC<CycleLoopModalProps> = ({
  steps,
  currentLoop,
  onSave,
  onClose,
}) => {
  const [repeatCount, setRepeatCount] = useState<number>(currentLoop?.repeatCount ?? 35);
  const [startIndex, setStartIndex] = useState<number>(currentLoop?.startStepIndex ?? (steps.length > 2 ? 1 : 0));
  const [endIndex, setEndIndex] = useState<number>(currentLoop?.endStepIndex ?? (steps.length > 3 ? 3 : steps.length - 1));

  const handleAdjustCycles = (delta: number) => {
    playKeyClick();
    setRepeatCount((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleApply = () => {
    playConfirmBeep();
    onSave({
      id: currentLoop?.id || 'loop_' + Date.now(),
      startStepIndex: Math.min(startIndex, endIndex),
      endStepIndex: Math.max(startIndex, endIndex),
      repeatCount: Math.max(1, repeatCount),
    });
    onClose();
  };

  const cyclePresets = [25, 30, 32, 35, 40];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Configuración de Ciclo PCR</h3>
              <p className="text-xs text-slate-400 font-mono">Bucle de Replicación Exponencial</p>
            </div>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Cycle Count Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              Número de Ciclos a Repetir
            </span>
            <div className="flex items-center justify-center gap-4 my-2">
              <button
                onClick={() => handleAdjustCycles(-1)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
              >
                <Minus className="w-5 h-5" />
              </button>

              <span className="text-4xl font-mono font-bold text-white tabular-nums px-4">
                {repeatCount}
              </span>

              <button
                onClick={() => handleAdjustCycles(1)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Cycle Presets */}
            <div className="flex justify-center gap-2 mt-2">
              {cyclePresets.map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => {
                    playKeyClick();
                    setRepeatCount(cnt);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    repeatCount === cnt
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {cnt}x
                </button>
              ))}
            </div>
          </div>

          {/* Steps Range Selection */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
              Rango de Pasos Incluidos en el Ciclo
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Start Step */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                  Paso Inicial (Inicio de ciclo):
                </label>
                <select
                  value={startIndex}
                  onChange={(e) => {
                    playKeyClick();
                    setStartIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-hidden focus:border-cyan-400"
                >
                  {steps.map((st, idx) => (
                    <option key={st.id} value={idx}>
                      #{idx + 1}: {st.name} ({st.temperature}°C)
                    </option>
                  ))}
                </select>
              </div>

              {/* End Step */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">
                  Paso Final (GOTO inicio):
                </label>
                <select
                  value={endIndex}
                  onChange={(e) => {
                    playKeyClick();
                    setEndIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-hidden focus:border-cyan-400"
                >
                  {steps.map((st, idx) => (
                    <option key={st.id} value={idx}>
                      #{idx + 1}: {st.name} ({st.temperature}°C)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/80 font-mono">
              Al finalizar el paso #{endIndex + 1}, el termociclador volverá al paso #{startIndex + 1}{' '}
              repetido durante <strong className="text-amber-300">{repeatCount} ciclos</strong>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Guardar Bucle
          </button>
        </div>
      </div>
    </div>
  );
};
