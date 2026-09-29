import { memo } from 'react';
import { Flame, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { ProtocolStep, SimulationPhase, SimulationSpeed, SimulationState } from '@thermocycler/core';
import { useRampedValue } from '../hooks/useRampedValue';
import { cssVars, formatClock, temperatureColor } from '../lib/format';
import { simulation, useSimulation } from '../state/simulation';
import { ProgressRing } from './ProgressRing';
import { WellPlate } from './WellPlate';
import { STEP_TYPE_LABELS } from './StepRow';

const AMBIENT_TEMPERATURE = 25;
const LID_TEMPERATURE = 105;

const PHASE_LABELS: Record<SimulationPhase, string> = {
  idle: 'En espera',
  initial: 'Desnaturalización inicial',
  cycle: 'Ciclado',
  final_extension: 'Extensión final',
  hold: 'Mantenimiento',
  completed: 'Finalizado',
};

/* ---------- Panel del instrumento (se re-renderiza en cada frame) ---------- */

// Solo las lecturas del display cambian por frame; el resto de piezas
// están memorizadas y se actualizan únicamente cuando cambian sus props.
export function DevicePanel() {
  const snapshot = useSimulation(s => s.snapshot);
  const protocol = useSimulation(s => s.programmed);
  const { state, phase, targetTemperature: setpoint } = snapshot;

  const isActive = state === 'RUNNING' || state === 'PAUSED';
  const blockTemperature = useRampedValue(isActive || phase === 'hold' ? setpoint ?? AMBIENT_TEMPERATURE : AMBIENT_TEMPERATURE);
  const blockColor = temperatureColor(blockTemperature);
  const totalCycles = snapshot.totalCycles ?? protocol?.cycles.count ?? 0;
  const inCycle = phase === 'cycle';
  const completedCycles = inCycle ? (snapshot.cycleNumber ?? 1) - 1 : ['final_extension', 'hold', 'completed'].includes(phase) ? totalCycles : 0;

  return (
    <section className="card device" aria-labelledby="device-title" style={cssVars({ '--block-color': blockColor })}>
      <header className="card__head">
        <div>
          <p className="eyebrow">Instrumento</p>
          <h2 id="device-title" className="card__title">
            Termociclador TC-96
          </h2>
        </div>
        <div className={`lid ${isActive ? 'lid--on' : ''}`}>
          <Flame size={14} aria-hidden="true" />
          Tapa {isActive ? `${LID_TEMPERATURE} °C` : 'apagada'}
        </div>
      </header>

      {/* Display: temperatura del bloque, lecturas y placa */}
      <div className="device__display">
        <div className="lcd">
          <ProgressRing fraction={snapshot.progressFraction} color={blockColor}>
            <span className="lcd__temp mono">
              {blockTemperature.toFixed(1)}
              <small>°C</small>
            </span>
            <span className="lcd__temp-label">Bloque</span>
          </ProgressRing>

          <dl className="lcd__readouts">
            <div className="readout readout--wide">
              <dt>Fase</dt>
              <dd>{PHASE_LABELS[phase]}</dd>
            </div>
            <div className="readout">
              <dt>Consigna</dt>
              <dd className="mono" style={{ color: temperatureColor(setpoint) }}>
                {setpoint !== undefined ? `${setpoint.toFixed(1)} °C` : '--.- °C'}
              </dd>
            </div>
            <div className="readout">
              <dt>Ciclo</dt>
              <dd className="mono">{`${inCycle ? snapshot.cycleNumber : '—'}/${totalCycles || '—'}`}</dd>
            </div>
            <div className="readout">
              <dt>Resta en fase</dt>
              <dd className="mono">{formatClock(snapshot.remainingInPhaseSeconds)}</dd>
            </div>
            <div className="readout">
              <dt>Transcurrido</dt>
              <dd className="mono">
                {formatClock(snapshot.elapsedSeconds)}
                <span className="readout__total"> / {formatClock(snapshot.totalSeconds)}</span>
              </dd>
            </div>
          </dl>
        </div>

        <WellPlate active={state === 'RUNNING'} />
      </div>

      <StepChips steps={protocol?.cycles.steps} current={inCycle ? snapshot.stepIndex : undefined} />
      <CycleTrack total={totalCycles} completed={completedCycles} current={inCycle} />

      <footer className="device__controls">
        <Transport state={state} canStop={isActive || phase === 'hold'} />
        <SpeedSelector />
      </footer>
    </section>
  );
}

/* ---------- Pasos del ciclo, resaltando el actual ---------- */

const StepChips = memo(function StepChips({ steps, current }: { steps?: ProtocolStep[]; current?: number }) {
  if (!steps?.length) return null;
  return (
    <div className="device__steps" aria-label="Pasos del ciclo">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`chip-step ${current === i ? 'chip-step--current' : ''}`}
          style={cssVars({ '--chip-color': temperatureColor(step.temperature) })}
          aria-current={current === i ? 'step' : undefined}
        >
          <span className="chip-step__name">{step.label || STEP_TYPE_LABELS[step.type]}</span>
          <span className="chip-step__meta mono">
            {step.temperature}°C · {step.durationSeconds}s
          </span>
        </div>
      ))}
    </div>
  );
});

/* ---------- Pista de ciclos: solo cambia al completar un ciclo ---------- */

const CycleTrack = memo(function CycleTrack({ total, completed, current }: { total: number; completed: number; current: boolean }) {
  if (total <= 0) return null;
  return (
    <div className="cycle-track" role="img" aria-label={`${completed} de ${total} ciclos completados`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`cycle-track__dot ${i < completed ? 'is-done' : ''} ${current && i === completed ? 'is-current' : ''}`} />
      ))}
    </div>
  );
});

/* ---------- Controles de transporte ---------- */

const Transport = memo(function Transport({ state, canStop }: { state: SimulationState; canStop: boolean }) {
  const canPlay = ['PROGRAMMED', 'PAUSED', 'STOPPED', 'COMPLETED'].includes(state);
  const replay = state === 'COMPLETED';
  return (
    <div className="transport">
      {state === 'RUNNING' ? (
        <button type="button" className="btn btn--warn btn--lg" onClick={simulation.pause}>
          <Pause size={18} aria-hidden="true" />
          Pausar
        </button>
      ) : (
        <button type="button" className="btn btn--primary btn--lg" onClick={simulation.play} disabled={!canPlay}>
          {replay ? <RotateCcw size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {state === 'PAUSED' ? 'Reanudar' : replay ? 'Repetir' : 'Iniciar'}
        </button>
      )}
      <button type="button" className="btn btn--ghost btn--lg" onClick={simulation.stop} disabled={!canStop}>
        <Square size={16} aria-hidden="true" />
        Detener
      </button>
    </div>
  );
});

/* ---------- Selector de velocidad (segmented control) ---------- */

function SpeedSelector() {
  const speed = useSimulation(s => s.speed);
  return (
    <div className="speed" role="radiogroup" aria-label="Velocidad de simulación">
      <span className="speed__label">Velocidad</span>
      {simulation.speeds.map((s: SimulationSpeed) => (
        <button key={s} type="button" role="radio" aria-checked={s === speed} className={`speed__opt ${s === speed ? 'is-active' : ''}`} onClick={() => simulation.setSpeed(s)}>
          {s}×
        </button>
      ))}
    </div>
  );
}
