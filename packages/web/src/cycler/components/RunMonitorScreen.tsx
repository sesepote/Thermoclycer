import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Flame, 
  Clock, 
  Thermometer, 
  FastForward, 
  Grid, 
  Activity, 
  CheckCircle2
} from 'lucide-react';
import { PCRProtocol, RunProgressState } from '../types/pcr';
import { formatDuration } from '../utils/gradient';
import { ThermalProfileGraph } from './ThermalProfileGraph';
import { Plate96View } from './Plate96View';
import { Modal } from './Modal';
import { playKeyClick, playConfirmBeep } from '../utils/audio';

interface RunMonitorScreenProps {
  protocol: PCRProtocol;
  runProgress: RunProgressState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAdvanceStep: () => void;
  onSkipPreheat: () => void;
  onSetSimSpeed: (speed: number) => void;
  onBackToEditor: () => void;
}

export const RunMonitorScreen: React.FC<RunMonitorScreenProps> = ({
  protocol,
  runProgress,
  onPause,
  onResume,
  onStop,
  onAdvanceStep,
  onSkipPreheat,
  onSetSimSpeed,
  onBackToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'plate'>('profile');
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const activeStep = protocol.steps[runProgress.currentStepIndex] || protocol.steps[0];
  const isPreheating = runProgress.state === 'preheating_lid';
  const isPaused = runProgress.state === 'paused';
  const isHolding = runProgress.state === 'holding';
  const isCompleted = runProgress.state === 'completed';

  const loop = protocol.loops.find(
    (l) => runProgress.currentStepIndex >= l.startStepIndex && runProgress.currentStepIndex <= l.endStepIndex
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden select-none">
      {/* Top Banner: Stage Status & Speed Selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${
              isPreheating
                ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse'
                : isPaused
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : isHolding
                ? 'bg-blue-950/60 border-blue-500/50 text-cyan-300'
                : isCompleted
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPaused
                  ? 'bg-amber-400'
                  : isCompleted
                  ? 'bg-emerald-400'
                  : 'bg-emerald-400'
              }`}
            ></span>
            <span>
              {isPreheating
                ? 'CALENTANDO TAPA'
                : isPaused
                ? 'EN PAUSA'
                : isHolding
                ? 'CONSERVACIÓN 4°C'
                : isCompleted
                ? 'CORRIDA COMPLETADA'
                : runProgress.isRamping
                ? `RAMPA (${runProgress.rampVelocity > 0 ? '+' : ''}${runProgress.rampVelocity}°C/s)`
                : 'INCUBACIÓN TÉRMICA'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Paso Actual:</span>
            <span className="font-bold text-white font-mono">
              #{runProgress.currentStepIndex + 1} ({activeStep?.name})
            </span>
            {activeStep?.gradient?.enabled && (
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono">
                GRADIENTE ACTIVO
              </span>
            )}
          </div>
        </div>

        {/* Speed Multiplier & View Toggle */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <FastForward className="w-3.5 h-3.5 text-cyan-400 ml-1" />
            <span className="text-[10px] text-slate-400 font-mono mr-1">Velocidad:</span>
            {[1, 5, 20, 60].map((s) => (
              <button
                key={s}
                onClick={() => {
                  playKeyClick();
                  onSetSimSpeed(s);
                }}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                  runProgress.simSpeed === s
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Tab View Selector (Profile vs 96-Well Plate) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('profile');
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'profile'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('plate');
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                activeTab === 'plate'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Placa 96W</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preheating Notification Banner */}
      {isPreheating && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-red-200 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            <div>
              <span className="font-bold">Calentando Tapa Térmica Anti-evaporación:</span>{' '}
              <span className="font-mono">{runProgress.currentLidTemp.toFixed(1)}°C</span> de{' '}
              <span className="font-mono">{runProgress.targetLidTemp}°C</span>
            </div>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onSkipPreheat();
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase transition-colors cursor-pointer"
          >
            Saltar Precalentamiento
          </button>
        </div>
      )}

      {/* Main Telemetry Readout Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Current Block Temp */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="uppercase">Temp Bloque</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white tabular-nums tracking-tight">
              {runProgress.currentBlockTemp.toFixed(1)}
              <span className="text-sm font-normal text-slate-400 ml-1">°C</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-cyan-400/90 flex items-center justify-between">
            <span>Objetivo: {runProgress.targetBlockTemp.toFixed(1)}°C</span>
            {runProgress.isRamping && (
              <span className="text-amber-400 font-bold">
                {runProgress.rampVelocity > 0 ? '▲' : '▼'} {Math.abs(runProgress.rampVelocity)}°C/s
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Cycle Loop Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="uppercase">Ciclo Actual</span>
            <span className="text-amber-400 font-bold font-mono">
              {loop ? `${loop.repeatCount} total` : 'Sin bucle'}
            </span>
          </div>
          <div className="my-1">
            <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-300 tabular-nums">
              {loop ? `${runProgress.currentCycle} / ${loop.repeatCount}` : '1 / 1'}
            </div>
          </div>
          {/* Cycle Progress Bar */}
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{
                width: loop
                  ? `${Math.min(100, (runProgress.currentCycle / loop.repeatCount) * 100)}%`
                  : '100%',
              }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Time Remaining in Active Step */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="uppercase">Tiempo en Paso</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="text-3xl sm:text-4xl font-mono font-bold text-cyan-400 tabular-nums">
              {activeStep?.isInfiniteHold
                ? '∞ (Hold)'
                : formatDuration(runProgress.stepRemainingSeconds)}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Transcurrido:{' '}
            <span className="text-slate-200">{formatDuration(runProgress.stepElapsedSeconds)}</span>
          </div>
        </div>

        {/* Metric 4: Estimated Remaining Time (ETA) & Elapsed Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="uppercase">Tiempo Total Restante</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="my-1">
            <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 tabular-nums">
              {isCompleted ? '00:00' : formatDuration(runProgress.estimatedRemainingSeconds)}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Total Corrida:{' '}
            <span className="text-slate-200">{formatDuration(runProgress.totalElapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Main Visual Display (Profile or 96-Well Plate) */}
      <div className="flex-1 min-h-[280px]">
        {activeTab === 'profile' ? (
          <ThermalProfileGraph
            protocol={protocol}
            selectedStepIndex={runProgress.currentStepIndex}
            onSelectStep={() => {}}
            onEditTemperature={() => {}}
            onEditTime={() => {}}
            onEditLoop={() => {}}
            onOpenGradient={() => {}}
            runProgress={runProgress}
            isInteractive={false}
          />
        ) : (
          <Plate96View
            protocol={protocol}
            activeStep={activeStep}
            currentBlockTemp={runProgress.currentBlockTemp}
            isModal={false}
          />
        )}
      </div>

      {/* Bottom Run Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Stop / Abort */}
        <div className="flex items-center gap-2">
          {!isCompleted ? (
            <button
              onClick={() => {
                playKeyClick();
                setShowConfirmStop(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 active:bg-red-950 border border-red-500/50 text-red-200 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-red-400 text-red-400" />
              <span>DETENER CORRIDA</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playKeyClick();
                onBackToEditor();
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>VOLVER AL EDITOR</span>
            </button>
          )}
        </div>

        {/* Right: Step Skip & Pause/Resume */}
        {!isCompleted && (
          <div className="flex items-center gap-2">
            {/* Skip Step */}
            <button
              onClick={() => {
                playKeyClick();
                onAdvanceStep();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs font-semibold transition-all cursor-pointer"
              title="Avanzar manualmente al siguiente paso"
            >
              <SkipForward className="w-4 h-4 text-cyan-400" />
              <span>Saltar Paso</span>
            </button>

            {/* Pause / Resume */}
            {isPaused ? (
              <button
                onClick={() => {
                  playConfirmBeep();
                  onResume();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>REANUDAR</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  playKeyClick();
                  onPause();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>PAUSAR</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stop Confirmation Dialog */}
      {showConfirmStop && (
        <Modal title="Detener corrida" onClose={() => setShowConfirmStop(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-white text-base">¿Detener Corrida de PCR?</h4>
            <p className="text-xs text-slate-300">
              Se interrumpirá el ciclo térmico actual y el bloque volverá a temperatura ambiente.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmStop(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
              >
                Continuar Corrida
              </button>
              <button
                onClick={() => {
                  setShowConfirmStop(false);
                  onStop();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold"
              >
                Sí, Detener
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
