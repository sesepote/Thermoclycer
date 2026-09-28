import { Pause, Play, Square, Flame } from 'lucide-react';
import { Protocol, SimulationPhase, SimulationSnapshot, SimulationSpeed } from '@thermocycler/core';
import { useRampedValue } from '../hooks/useRampedValue';
import { formatClock, temperatureColor } from '../lib/format';
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

interface DevicePanelProps {
  snapshot: SimulationSnapshot;
  protocol: Protocol | null;
  speeds: readonly SimulationSpeed[];
  currentSpeed: SimulationSpeed;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
}

export function DevicePanel({
  snapshot,
  protocol,
  speeds,
  currentSpeed,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
}: DevicePanelProps) {
  const { state, phase } = snapshot;
  const isActive = state === 'RUNNING' || state === 'PAUSED';
  const setpoint = snapshot.targetTemperature;
  const blockTemperature = useRampedValue(isActive || phase === 'hold' ? setpoint ?? AMBIENT_TEMPERATURE : AMBIENT_TEMPERATURE);
  const blockColor = temperatureColor(blockTemperature);
  const lidOn = isActive;

  const canPlay = state === 'PROGRAMMED' || state === 'PAUSED' || state === 'STOPPED' || state === 'COMPLETED';
  const cycleSteps = protocol?.cycles.steps ?? [];
  const totalCycles = snapshot.totalCycles ?? protocol?.cycles.count ?? 0;
  const completedCycles =
    phase === 'cycle'
      ? (snapshot.cycleNumber ?? 1) - 1
      : phase === 'final_extension' || phase === 'hold' || phase === 'completed'
        ? totalCycles
        : 0;

  return (
    <section className="card device" aria-labelledby="device-title" style={{ '--block-color': blockColor } as React.CSSProperties}>
      <header className="card__head">
        <div>
          <p className="eyebrow">Instrumento</p>
          <h2 id="device-title" className="card__title">
            Termociclador TC-96
          </h2>
        </div>
        <div className={`lid ${lidOn ? 'lid--on' : ''}`}>
          <Flame size={14} aria-hidden="true" />
          Tapa {lidOn ? `${LID_TEMPERATURE} °C` : 'apagada'}
        </div>
      </header>

      <div className="device__display">
        <div className="lcd">
          <ProgressRing fraction={snapshot.progressFraction} color={blockColor}>
            <span className="lcd__temp mono" aria-live="off">
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
              <dd className="mono">{phase === 'cycle' ? `${snapshot.cycleNumber}/${totalCycles}` : `—/${totalCycles || '—'}`}</dd>
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

        <WellPlate color={blockColor} active={state === 'RUNNING'} />
      </div>

      {cycleSteps.length > 0 && (
        <div className="device__steps" aria-label="Pasos del ciclo">
          {cycleSteps.map((step, i) => {
            const current = phase === 'cycle' && snapshot.stepIndex === i;
            return (
              <div
                key={`${step.type}-${i}`}
                className={`chip-step ${current ? 'chip-step--current' : ''}`}
                style={{ '--chip-color': temperatureColor(step.temperature) } as React.CSSProperties}
                aria-current={current ? 'step' : undefined}
              >
                <span className="chip-step__name">{step.label || STEP_TYPE_LABELS[step.type]}</span>
                <span className="chip-step__meta mono">
                  {step.temperature}°C · {step.durationSeconds}s
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalCycles > 0 && (
        <div className="cycle-track" aria-label={`${completedCycles} de ${totalCycles} ciclos completados`}>
          {Array.from({ length: totalCycles }, (_, i) => (
            <span
              key={i}
              className={`cycle-track__dot ${i < completedCycles ? 'is-done' : ''} ${
                phase === 'cycle' && i === completedCycles ? 'is-current' : ''
              }`}
            />
          ))}
        </div>
      )}

      <footer className="device__controls">
        <div className="transport">
          {state === 'RUNNING' ? (
            <button type="button" className="btn btn--warn btn--lg" onClick={onPause}>
              <Pause size={18} aria-hidden="true" />
              Pausar
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={onPlay} disabled={!canPlay}>
              <Play size={18} aria-hidden="true" />
              {state === 'PAUSED' ? 'Reanudar' : 'Iniciar'}
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--lg" onClick={onStop} disabled={!isActive && phase !== 'hold'}>
            <Square size={16} aria-hidden="true" />
            Detener
          </button>
        </div>

        <div className="speed" role="radiogroup" aria-label="Velocidad de simulación">
          <span className="speed__label">Velocidad</span>
          {speeds.map(s => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === currentSpeed}
              className={`speed__opt ${s === currentSpeed ? 'is-active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </footer>
    </section>
  );
}
