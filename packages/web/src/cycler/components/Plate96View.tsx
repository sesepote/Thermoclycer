import React, { useState } from 'react';
import { X, Grid, Info } from 'lucide-react';
import { PCRProtocol, PCRStep } from '../types/pcr';
import { calculateGradientColumns, getThermalColor } from '../utils/gradient';
import { playKeyClick } from '../utils/audio';

interface Plate96ViewProps {
  protocol: PCRProtocol;
  activeStep?: PCRStep;
  currentBlockTemp?: number;
  onClose?: () => void;
  isModal?: boolean;
}

export const Plate96View: React.FC<Plate96ViewProps> = ({
  protocol,
  activeStep,
  currentBlockTemp,
  onClose,
  isModal = true,
}) => {
  const step = activeStep || protocol.steps.find((s) => s.gradient?.enabled) || protocol.steps[0];
  const isGradient = step.gradient?.enabled;

  const lowTemp = isGradient ? step.gradient!.lowTemp : currentBlockTemp ?? step.temperature;
  const highTemp = isGradient ? step.gradient!.highTemp : currentBlockTemp ?? step.temperature;
  const columns = calculateGradientColumns(lowTemp, highTemp);

  const [selectedWell, setSelectedWell] = useState<{ row: string; col: number; temp: number } | null>({
    row: 'D',
    col: 6,
    temp: columns[5]?.temperature ?? step.temperature,
  });

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const content = (
    <div className="flex flex-col space-y-3">
      {/* Plate Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
        <div>
          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Bloque de Gradiente T5000: 96 Pozos (0.2 mL)
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Paso Ref: <strong className="text-cyan-300">{step.name}</strong> ({isGradient ? `Gradiente ${lowTemp}°C ~ ${highTemp}°C` : `${step.temperature.toFixed(1)}°C uniforme`})
          </div>
        </div>

        {selectedWell ? (
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-cyan-500/30">
            <span className="text-xs font-mono text-slate-400">Pozo:</span>
            <span className="text-sm font-mono font-bold text-white">{selectedWell.row}{selectedWell.col}</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{selectedWell.temp.toFixed(1)}°C</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Toque un pozo para inspeccionar
          </div>
        )}
      </div>

      {/* 96 Well Matrix */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Column Indices 1-12 */}
          <div className="grid grid-cols-13 gap-1.5 mb-1.5 text-center text-xs font-mono text-slate-400 font-semibold">
            <div className="text-slate-600">#</div>
            {columns.map((c) => (
              <div key={c.column} className="flex flex-col items-center">
                <span>{c.column}</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  {c.temperature.toFixed(1)}°
                </span>
              </div>
            ))}
          </div>

          {/* 8 Rows A-H */}
          {rows.map((row) => (
            <div key={row} className="grid grid-cols-13 gap-1.5 mb-1.5 items-center">
              <div className="text-center font-mono text-xs text-slate-400 font-bold">
                {row}
              </div>
              {Array.from({ length: 12 }, (_, colIdx) => {
                const colNum = colIdx + 1;
                const colData = columns[colIdx];
                const temp = colData.temperature;
                const color = getThermalColor(temp);
                const isSel = selectedWell?.row === row && selectedWell?.col === colNum;

                return (
                  <button
                    key={colNum}
                    onClick={() => {
                      playKeyClick();
                      setSelectedWell({ row, col: colNum, temp });
                    }}
                    className={`aspect-square rounded-full relative flex items-center justify-center transition-all cursor-pointer group ${
                      isSel ? 'ring-2 ring-white scale-110 z-10' : 'hover:scale-115'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: isSel ? `0 0 10px ${color.hex}` : `0 0 3px ${color.hex}50`,
                    }}
                    title={`Pozo ${row}${colNum} (${temp.toFixed(1)}°C)`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white/30 group-hover:bg-white/60"></span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Temperature Colormap Gradient Legend */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
        <span className="text-cyan-400">4.0°C (Hold)</span>
        <div className="flex-1 mx-4 h-2.5 rounded-full bg-gradient-to-r from-blue-600 via-emerald-400 via-amber-400 via-orange-500 to-red-600"></div>
        <span className="text-red-400">95.0°C (Denat)</span>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Distribución Térmica en Placa 96 Pozos</h3>
              <p className="text-xs text-slate-400 font-mono">Simulación de Bloque Peltier de Gradiente</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5">{content}</div>

        {/* Footer */}
        {onClose && (
          <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex justify-end">
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
