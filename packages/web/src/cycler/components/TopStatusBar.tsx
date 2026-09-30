import React, { useState } from 'react';
import { PCRProtocol, RunProgressState } from '../types/pcr';
import { 
  Flame, 
  Thermometer, 
  Volume2, 
  VolumeX, 
  Settings, 
  FolderOpen,
  Grid
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playKeyClick } from '../utils/audio';

interface TopStatusBarProps {
  protocol: PCRProtocol;
  runProgress: RunProgressState;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenWellPlate: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  protocol,
  runProgress,
  onOpenLibrary,
  onOpenSettings,
  onOpenWellPlate,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playKeyClick();
  };

  const isRunning = runProgress.state !== 'idle' && runProgress.state !== 'completed';

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2.5 flex items-center justify-between text-xs select-none shadow-md">
      {/* Zone 1: Program Name and Presets Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            playKeyClick();
            onOpenLibrary();
          }}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
          title="Abrir o Guardar Protocolos"
        >
          <FolderOpen className="w-4 h-4 text-cyan-400 group-hover:scale-105 transition-transform" />
          <span className="font-mono font-bold tracking-wide text-sm">{protocol.name}</span>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-500/20 px-1.5 py-0.5 rounded font-sans">
            {protocol.steps.length} pasos
          </span>
        </button>

        <button
          onClick={() => {
            playKeyClick();
            onOpenWellPlate();
          }}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-mono text-xs transition-colors"
          title="Ver Placa de 96 Pozos y Gradiente Térmico"
        >
          <Grid className="w-3.5 h-3.5 text-cyan-400" />
          <span>Placa 96 Pozos</span>
        </button>
      </div>

      {/* Zone 2: Real-time Instrument Telemetry Badges */}
      <div className="flex items-center gap-3 font-mono">
        {/* Lid Temp */}
        <div 
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs transition-colors ${
            protocol.lidHeatingEnabled 
              ? runProgress.currentLidTemp >= (protocol.lidTemperature - 1)
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300 animate-pulse'
              : 'bg-slate-800/60 border-slate-700 text-slate-500'
          }`}
          title="Tapa Térmica Calefactada"
        >
          <Flame className={`w-3.5 h-3.5 ${protocol.lidHeatingEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
          <span className="text-[10px] text-slate-400 uppercase">Tapa:</span>
          <span className="font-bold tabular-nums">
            {runProgress.currentLidTemp.toFixed(1)}°C
          </span>
          {protocol.lidHeatingEnabled && (
            <span className="text-[10px] text-slate-400">/{protocol.lidTemperature}°C</span>
          )}
        </div>

        {/* Block Temp */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-cyan-300 text-xs shadow-inner">
          <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-slate-400 uppercase">Bloque:</span>
          <span className="font-bold tabular-nums text-white text-sm">
            {runProgress.currentBlockTemp.toFixed(1)}°C
          </span>
          {isRunning && (
            <span className="text-[10px] text-slate-400">Obj: {runProgress.targetBlockTemp.toFixed(1)}°C</span>
          )}
        </div>

        {/* Volume */}
        <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/80 text-slate-300 text-xs">
          <span className="text-[10px] text-slate-400">VOL:</span>
          <span className="font-semibold text-slate-200">{protocol.sampleVolume} µL</span>
        </div>
      </div>

      {/* Zone 3: Instrument Controls (la hora ya la muestra la barra del equipo) */}
      <div className="flex items-center gap-2">
        {/* Sound toggle */}
        <button
          onClick={handleToggleSound}
          className={`p-2 rounded-lg border transition-colors ${
            soundOn
              ? 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700'
              : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
          }`}
          title={soundOn ? 'Silenciar beeps' : 'Activar beeps de laboratorio'}
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            playKeyClick();
            onOpenSettings();
          }}
          disabled={isRunning}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
          title="Configuración de Equipo"
        >
          <Settings className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
};
