import React, { useState } from 'react';
import { X, Delete, Check, RotateCcw } from 'lucide-react';
import { playKeyClick, playConfirmBeep } from '../utils/audio';
import { formatDuration } from '../utils/gradient';

interface TouchNumpadModalProps {
  mode: 'temperature' | 'time';
  stepName: string;
  stepNumber: number;
  initialValue: number; // For temp: 55.0. For time: seconds (e.g. 30)
  isInfiniteHold?: boolean;
  onSave: (value: number, isInfinite?: boolean) => void;
  onClose: () => void;
}

export const TouchNumpadModal: React.FC<TouchNumpadModalProps> = ({
  mode,
  stepName,
  stepNumber,
  initialValue,
  isInfiniteHold = false,
  onSave,
  onClose,
}) => {
  // Input string state
  const isTimeMode = mode === 'time';
  const [inputVal, setInputVal] = useState<string>(() => {
    if (isTimeMode) {
      if (isInfiniteHold || initialValue === 0) return '∞';
      const m = Math.floor(initialValue / 60);
      const s = initialValue % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return initialValue.toFixed(1);
  });

  const [isInfinite, setIsInfinite] = useState<boolean>(isInfiniteHold && isTimeMode);

  // Quick preset values
  const tempPresets = [
    { label: '95°C Desnat', val: 95.0 },
    { label: '72°C Ext', val: 72.0 },
    { label: '60°C', val: 60.0 },
    { label: '55°C Anneal', val: 55.0 },
    { label: '50°C', val: 50.0 },
    { label: '37°C Enzima', val: 37.0 },
    { label: '4°C Hold', val: 4.0 },
  ];

  const timePresets = [
    { label: '+10s', addSec: 10 },
    { label: '+30s', addSec: 30 },
    { label: '+1m', addSec: 60 },
    { label: '+5m', addSec: 300 },
  ];

  const handleKeyPress = (char: string) => {
    playKeyClick();
    if (isInfinite) {
      setIsInfinite(false);
      setInputVal(char);
      return;
    }

    if (isTimeMode) {
      // Time format MM:SS - direct digits entry
      const cleanDigits = (inputVal.replace(/\D/g, '') + char).slice(-4);
      if (cleanDigits.length <= 2) {
        setInputVal(`00:${cleanDigits.padStart(2, '0')}`);
      } else {
        const m = cleanDigits.slice(0, cleanDigits.length - 2).padStart(2, '0');
        const s = cleanDigits.slice(-2);
        setInputVal(`${m}:${s}`);
      }
    } else {
      // Temperature decimal entry
      if (char === '.') {
        if (!inputVal.includes('.')) {
          setInputVal(inputVal + '.');
        }
      } else {
        if (inputVal === '0') {
          setInputVal(char);
        } else {
          // Limit to 4 chars total (e.g. 95.5)
          if (inputVal.length < 5) {
            setInputVal(inputVal + char);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    playKeyClick();
    if (isInfinite) {
      setIsInfinite(false);
      setInputVal('00:30');
      return;
    }

    if (isTimeMode) {
      const cleanDigits = inputVal.replace(/\D/g, '').slice(0, -1);
      if (!cleanDigits) {
        setInputVal('00:00');
      } else if (cleanDigits.length <= 2) {
        setInputVal(`00:${cleanDigits.padStart(2, '0')}`);
      } else {
        const m = cleanDigits.slice(0, cleanDigits.length - 2).padStart(2, '0');
        const s = cleanDigits.slice(-2);
        setInputVal(`${m}:${s}`);
      }
    } else {
      if (inputVal.length <= 1) {
        setInputVal('0');
      } else {
        setInputVal(inputVal.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    playKeyClick();
    setIsInfinite(false);
    setInputVal(isTimeMode ? '00:00' : '0');
  };

  const handleFineAdjust = (delta: number) => {
    playKeyClick();
    if (isTimeMode) {
      setIsInfinite(false);
      let currentSec = parseCurrentTimeSeconds();
      currentSec = Math.max(0, currentSec + delta);
      setInputVal(formatDuration(currentSec));
    } else {
      let currentT = parseFloat(inputVal) || 0;
      currentT = Math.max(0, Math.min(105, currentT + delta));
      setInputVal(currentT.toFixed(1));
    }
  };

  const parseCurrentTimeSeconds = (): number => {
    if (isInfinite) return 0;
    const parts = inputVal.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return 30;
  };

  const handleSetInfinite = () => {
    playKeyClick();
    setIsInfinite(true);
    setInputVal('∞');
  };

  const handleConfirm = () => {
    playConfirmBeep();
    if (isTimeMode) {
      if (isInfinite || inputVal === '∞') {
        onSave(0, true);
      } else {
        const sec = parseCurrentTimeSeconds();
        onSave(Math.max(1, sec), false);
      }
    } else {
      let val = parseFloat(inputVal);
      if (isNaN(val)) val = 55.0;
      val = Math.max(0.0, Math.min(105.0, val));
      onSave(Number(val.toFixed(1)), false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
          <div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              {isTimeMode ? 'Editar Tiempo del Ciclo' : 'Editar Temperatura de Incubación'}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Paso #{stepNumber}: {stepName}</span>
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

        {/* Value Display Box (High Contrast LCD look) */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between shadow-inner">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">
              {isTimeMode ? 'DURACIÓN (MM:SS)' : 'TEMPERATURA'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-bold text-cyan-400 tabular-nums tracking-wider">
                {inputVal}
              </span>
              <span className="text-sm font-mono text-slate-400">
                {isTimeMode ? (isInfinite ? '(Hold)' : 'min:seg') : '°C'}
              </span>
            </div>
          </div>

          {/* Quick Fine Adjust Steppers */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {!isTimeMode ? (
              <>
                <button
                  onClick={() => handleFineAdjust(-1.0)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                >
                  -1.0°C
                </button>
                <button
                  onClick={() => handleFineAdjust(-0.1)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                >
                  -0.1°C
                </button>
                <button
                  onClick={() => handleFineAdjust(0.1)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                >
                  +0.1°C
                </button>
                <button
                  onClick={() => handleFineAdjust(1.0)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                >
                  +1.0°C
                </button>
              </>
            ) : (
              <>
                {timePresets.map((tp) => (
                  <button
                    key={tp.label}
                    onClick={() => handleFineAdjust(tp.addSec)}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                  >
                    {tp.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Numpad & Presets Body */}
        <div className="p-4 grid grid-cols-4 gap-2.5">
          {/* Main 3x4 Numpad */}
          <div className="col-span-3 grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/80 text-xl font-mono font-semibold text-white shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row */}
            <button
              onClick={handleClear}
              className="h-13 rounded-xl bg-slate-800/80 hover:bg-red-950/40 hover:border-red-500/50 text-slate-300 hover:text-red-300 border border-slate-700 text-sm font-mono font-medium flex items-center justify-center transition-all"
              title="Borrar todo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleKeyPress('0')}
              className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/80 text-xl font-mono font-semibold text-white shadow-sm flex items-center justify-center transition-all cursor-pointer"
            >
              0
            </button>

            {!isTimeMode ? (
              <button
                onClick={() => handleKeyPress('.')}
                className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/80 text-2xl font-mono font-bold text-white shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                .
              </button>
            ) : (
              <button
                onClick={handleSetInfinite}
                className="h-13 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xl font-mono font-bold flex items-center justify-center transition-all"
                title="Hold Infinito (Conservación 4°C)"
              >
                ∞
              </button>
            )}
          </div>

          {/* Right Column Action Keys */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBackspace}
              className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              title="Retroceso"
            >
              <Delete className="w-5 h-5" />
            </button>

            <button
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 border border-cyan-400 text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-3" />
              <span className="text-xs uppercase font-mono tracking-wider">OK</span>
            </button>
          </div>
        </div>

        {/* Quick PCR Preset Temp Chips */}
        {!isTimeMode && (
          <div className="px-4 pb-4">
            <div className="text-[10px] text-slate-400 font-mono uppercase mb-1.5">
              Valores Rápidos de Termociclador
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tempPresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    playKeyClick();
                    setInputVal(p.val.toFixed(1));
                  }}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-mono text-cyan-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
