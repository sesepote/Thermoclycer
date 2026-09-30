import React from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Repeat, 
  Flame, 
  Save, 
  Play, 
  Clock, 
  Thermometer 
} from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface BottomToolbarProps {
  onAddStep: () => void;
  onDeleteStep: () => void;
  onOpenLoop: () => void;
  onOpenGradient: () => void;
  onOpenSave: () => void;
  onStartRun: () => void;
  onEditSelectedTemp: () => void;
  onEditSelectedTime: () => void;
  canDelete: boolean;
  isGradientActive: boolean;
  isRunning: boolean;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onAddStep,
  onDeleteStep,
  onOpenLoop,
  onOpenGradient,
  onOpenSave,
  onStartRun,
  onEditSelectedTemp,
  onEditSelectedTime,
  canDelete,
  isGradientActive,
  isRunning,
}) => {
  if (isRunning) return null; // In running state, RunMonitorScreen has its own controls

  return (
    <footer className="w-full bg-slate-900/95 border-t border-slate-800 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xl select-none">
      {/* Group 1: Step Editing Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Insert Step */}
        <button
          onClick={() => {
            playKeyClick();
            onAddStep();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 active:bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition-all shadow-sm"
          title="Insertar nuevo paso después del seleccionado"
        >
          <PlusCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Insertar Paso</span>
          <span className="sm:hidden">+ Paso</span>
        </button>

        {/* Delete Step */}
        <button
          onClick={() => {
            playKeyClick();
            onDeleteStep();
          }}
          disabled={!canDelete}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-red-950/40 hover:border-red-500/40 active:bg-slate-900 border border-slate-700 text-slate-300 hover:text-red-300 text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          title="Eliminar paso seleccionado"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Eliminar Paso</span>
          <span className="sm:hidden">- Paso</span>
        </button>

        {/* Quick Temp & Time Touch Buttons */}
        <button
          onClick={() => {
            playKeyClick();
            onEditSelectedTemp();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
          title="Modificar Temperatura del paso"
        >
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <span>Temp</span>
        </button>

        <button
          onClick={() => {
            playKeyClick();
            onEditSelectedTime();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
          title="Modificar Tiempo del paso"
        >
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Tiempo</span>
        </button>
      </div>

      {/* Group 2: Advanced PCR Logic (Cycle Loop & Gradient) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Loop / Cycle */}
        <button
          onClick={() => {
            playKeyClick();
            onOpenLoop();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 active:bg-amber-950 border border-amber-500/40 text-amber-200 text-xs font-semibold tracking-wide transition-all shadow-sm"
          title="Configurar Ciclos y Bucles de Replicación"
        >
          <Repeat className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Configurar Ciclos</span>
          <span className="sm:hidden">Ciclos</span>
        </button>

        {/* Gradient */}
        <button
          onClick={() => {
            playKeyClick();
            onOpenGradient();
          }}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold tracking-wide transition-all shadow-sm ${
            isGradientActive
              ? 'bg-orange-600/30 hover:bg-orange-600/40 border-orange-500/60 text-orange-200'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Calculadora y Configuración de Gradiente Térmico (12 Columnas)"
        >
          <Flame className={`w-4 h-4 ${isGradientActive ? 'text-orange-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Gradiente (96W)</span>
          <span className="sm:hidden">Gradiente</span>
        </button>

        {/* Save / Presets */}
        <button
          onClick={() => {
            playKeyClick();
            onOpenSave();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition-all shadow-sm"
          title="Guardar o cargar programas"
        >
          <Save className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Guardar / Abrir</span>
          <span className="sm:hidden">Guardar</span>
        </button>

        {/* Primary START RUN Action */}
        <button
          onClick={() => {
            playKeyClick();
            onStartRun();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:from-emerald-700 active:to-teal-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 transition-all ml-1 cursor-pointer"
          title="Iniciar corrida de PCR con calentamiento de tapa y simulación en tiempo real"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>EJECUTAR</span>
        </button>
      </div>
    </footer>
  );
};
