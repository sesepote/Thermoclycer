import React, { useState } from 'react';
import { X, Flame, Check, HelpCircle } from 'lucide-react';
import { GradientConfig } from '../types/pcr';
import { calculateGradientColumns, getThermalColor } from '../utils/gradient';
import { playKeyClick, playConfirmBeep } from '../utils/audio';

interface GradientModalProps {
  stepName: string;
  stepNumber: number;
  initialGradient?: GradientConfig;
  currentStepTemp: number;
  onSave: (config: GradientConfig | undefined) => void;
  onClose: () => void;
}

export const GradientModal: React.FC<GradientModalProps> = ({
  stepName,
  stepNumber,
  initialGradient,
  currentStepTemp,
  onSave,
  onClose,
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialGradient?.enabled ?? false);
  const [lowTemp, setLowTemp] = useState<number>(
    initialGradient?.lowTemp ?? Math.max(30, currentStepTemp - 5)
  );
  const [highTemp, setHighTemp] = useState<number>(
    initialGradient?.highTemp ?? Math.min(95, currentStepTemp + 5)
  );

  const [selectedWell, setSelectedWell] = useState<{ row: string; col: number; temp: number } | null>(null);

  // Calculate 12 column distribution
  const columns = calculateGradientColumns(lowTemp, highTemp);
  const span = Number((highTemp - lowTemp).toFixed(1));

  const handleLowChange = (delta: number) => {
    playKeyClick();
    setLowTemp((prev) => {
      const next = Math.max(30, Math.min(highTemp - 1, Number((prev + delta).toFixed(1))));
      return next;
    });
  };

  const handleHighChange = (delta: number) => {
    playKeyClick();
    setHighTemp((prev) => {
      const next = Math.min(99, Math.max(lowTemp + 1, Number((prev + delta).toFixed(1))));
      return next;
    });
  };

  const handleApply = () => {
    playConfirmBeep();
    if (!enabled) {
      onSave(undefined);
    } else {
      onSave({
        enabled: true,
        lowTemp,
        highTemp,
      });
    }
    onClose();
  };

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Configuración de Gradiente Térmico (Bloque 96 Pozos)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Paso #{stepNumber}: {stepName}
              </p>
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Enable Toggle Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-semibold text-white text-sm">
                Modo Gradiente de Temperatura
              </div>
              <div className="text-xs text-slate-400">
                Genera 12 temperaturas independientes a lo largo de las 12 columnas del bloque
              </div>
            </div>
            <button
              onClick={() => {
                playKeyClick();
                setEnabled(!enabled);
              }}
              className={`px-4 py-2 rounded-lg font-mono font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                enabled
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Flame className="w-4 h-4" />
              {enabled ? 'GRADIENTE ACTIVO' : 'GRADIENTE DESACTIVADO'}
            </button>
          </div>

          {enabled && (
            <>
              {/* Temperature Range Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Low Temp */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase">
                    Temp Mínima (Columna 1)
                  </span>
                  <span className="text-2xl font-mono font-bold text-white my-1">
                    {lowTemp.toFixed(1)}°C
                  </span>
                  <div className="flex gap-1.5 w-full mt-1">
                    <button
                      onClick={() => handleLowChange(-1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      -1°C
                    </button>
                    <button
                      onClick={() => handleLowChange(-0.1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      -0.1
                    </button>
                    <button
                      onClick={() => handleLowChange(0.1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      +0.1
                    </button>
                    <button
                      onClick={() => handleLowChange(1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      +1°C
                    </button>
                  </div>
                </div>

                {/* Span Badge */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-mono text-amber-400 uppercase">
                    Rango Térmico (ΔT)
                  </span>
                  <span className="text-3xl font-mono font-bold text-amber-300 my-1">
                    {span.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Centro: {((lowTemp + highTemp) / 2).toFixed(1)}°C
                  </span>
                </div>

                {/* High Temp */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                  <span className="text-[11px] font-mono text-red-400 uppercase">
                    Temp Máxima (Columna 12)
                  </span>
                  <span className="text-2xl font-mono font-bold text-white my-1">
                    {highTemp.toFixed(1)}°C
                  </span>
                  <div className="flex gap-1.5 w-full mt-1">
                    <button
                      onClick={() => handleHighChange(-1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      -1°C
                    </button>
                    <button
                      onClick={() => handleHighChange(-0.1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      -0.1
                    </button>
                    <button
                      onClick={() => handleHighChange(0.1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      +0.1
                    </button>
                    <button
                      onClick={() => handleHighChange(1)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      +1°C
                    </button>
                  </div>
                </div>
              </div>

              {/* 12-Column Calculated Temperature Table (The hallmark of T5000-96 screen!) */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    <span>Tabla de 12 Columnas Calculadas</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Resolución: 0.1°C
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 text-center">
                  {columns.map((c) => {
                    const color = getThermalColor(c.temperature);
                    return (
                      <div
                        key={c.column}
                        className="flex flex-col rounded-lg p-1.5 border border-slate-800"
                        style={{ backgroundColor: `${color.hex}25` }}
                      >
                        <span className="text-[10px] font-mono text-slate-400">
                          Col {c.column}
                        </span>
                        <span
                          className="font-mono font-bold text-xs my-0.5"
                          style={{ color: color.hex }}
                        >
                          {c.temperature.toFixed(1)}°
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {c.deviation > 0 ? `+${c.deviation}` : c.deviation}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 96-Well Plate Interactive Preview */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
                    Mapa Térmico de la Placa (8 x 12 Pozos)
                  </div>
                  {selectedWell && (
                    <div className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/40">
                      Pozo {selectedWell.row}{selectedWell.col}: {selectedWell.temp.toFixed(1)}°C
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[480px]">
                    {/* Column Headers */}
                    <div className="grid grid-cols-13 gap-1 mb-1 text-center text-[10px] font-mono text-slate-400">
                      <div></div>
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i + 1}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Well Grid */}
                    {rows.map((row) => (
                      <div key={row} className="grid grid-cols-13 gap-1 mb-1 items-center">
                        <div className="text-center font-mono text-[10px] text-slate-400 font-bold">
                          {row}
                        </div>
                        {Array.from({ length: 12 }, (_, colIdx) => {
                          const colNum = colIdx + 1;
                          const colData = columns[colIdx];
                          const color = getThermalColor(colData.temperature);
                          const isSel = selectedWell?.row === row && selectedWell?.col === colNum;

                          return (
                            <button
                              key={colNum}
                              onClick={() => {
                                playKeyClick();
                                setSelectedWell({ row, col: colNum, temp: colData.temperature });
                              }}
                              className={`aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-125 cursor-pointer ${
                                isSel ? 'ring-2 ring-white scale-110' : ''
                              }`}
                              style={{
                                backgroundColor: color.hex,
                                boxShadow: `0 0 6px ${color.hex}60`,
                              }}
                              title={`Pozo ${row}${colNum}: ${colData.temperature.toFixed(1)}°C`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {!enabled && (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">El gradiente térmico está desactivado para este paso.</p>
              <p className="text-xs text-slate-500 mt-1">
                Active el botón superior para calcular la rampa térmica a través de las 12 columnas.
              </p>
            </div>
          )}
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
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Aplicar Gradiente
          </button>
        </div>
      </div>
    </div>
  );
};
