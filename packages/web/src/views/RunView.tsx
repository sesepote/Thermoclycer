import { CSSProperties, ReactNode, memo, useState } from 'react';
import { Activity, FilePlus2, Grid3x3, LayoutList, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { SimulationSpeed } from '@thermocycler/core';
import { StageDiagram } from '../components/run/StageDiagram';
import { ThermalProfile } from '../components/ThermalProfile';
import { WellPlate } from '../components/WellPlate';
import { cssVars, formatClock, temperatureColor } from '../lib/format';
import { PHASE_LABELS, STEP_TYPE_LABELS } from '../lib/labels';
import { useApp } from '../state/app';
import { LID_SETPOINT, SimulationState, simulation, useSimulation, useTemperature } from '../state/simulation';

/* ---------- Modo del equipo (lo que mostraría su display) ---------- */

type RunMode = 'idle' | 'lid' | 'up' | 'down' | 'incubate' | 'paused' | 'hold' | 'completed' | 'stopped' | 'error';

const MODE_INFO: Record<RunMode, { label: string; tone: string }> = {
  idle: { label: 'Listo para iniciar', tone: 'idle' },
  lid: { label: 'Calentando tapa', tone: 'heat' },
  up: { label: 'Rampa ▲ calentando', tone: 'heat' },
  down: { label: 'Rampa ▼ enfriando', tone: 'cool' },
  incubate: { label: 'Incubación', tone: 'ok' },
  paused: { label: 'En pausa', tone: 'warn' },
  hold: { label: 'Conservación (hold)', tone: 'cool' },
  completed: { label: 'Corrida completada', tone: 'ok' },
  stopped: { label: 'Corrida detenida', tone: 'error' },
  error: { label: 'Error de programa', tone: 'error' },
};

const RAMP_BAND = 0.5; // °C de diferencia con la consigna para considerar que está en rampa

function runMode({ snapshot: { state, phase, targetTemperature }, blockTemperature, lidTemperature }: SimulationState): RunMode {
  if (state === 'ERROR') return 'error';
  if (state === 'PAUSED') return 'paused';
  if (state === 'STOPPED') return 'stopped';
  if (phase === 'hold') return 'hold';
  if (state === 'COMPLETED') return 'completed';
  if (state !== 'RUNNING') return 'idle';
  if (lidTemperature < LID_SETPOINT - 1) return 'lid';
  const delta = (targetTemperature ?? blockTemperature) - blockTemperature;
  return delta > RAMP_BAND ? 'up' : delta < -RAMP_BAND ? 'down' : 'incubate';
}

type Tab = 'stages' | 'profile' | 'plate';
const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'stages', label: 'Etapas', icon: LayoutList },
  { id: 'profile', label: 'Perfil', icon: Activity },
  { id: 'plate', label: 'Placa 96', icon: Grid3x3 },
];

/* ---------- Pantalla ---------- */

// Panel de ejecución del termociclador. Cada bloque se suscribe solo a
// lo que muestra: las lecturas cambian por frame, el resto no.
export default function RunView() {
  const programmed = useSimulation(s => s.programmed);
  const [tab, setTab] = useState<Tab>('stages');
  const [confirmStop, setConfirmStop] = useState(false);

  if (!programmed) return <NoProgram />;

  return (
    <div className="run">
      <RunBanner />
      <Readouts />

      <section className="run__display" aria-label="Visualización de la corrida">
        <div className="segmented" role="tablist" aria-label="Vista">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={`segmented__opt ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {tab === 'stages' && <StageDiagram protocol={programmed} />}
        {tab === 'profile' && <LiveProfile />}
        {tab === 'plate' && <LivePlate />}
      </section>

      <RunControls onStop={() => setConfirmStop(true)} />

      {confirmStop && (
        <div className="dialog-backdrop" onClick={() => setConfirmStop(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="stop-title" onClick={e => e.stopPropagation()}>
            <h2 id="stop-title">¿Detener la corrida?</h2>
            <p>Se interrumpe el ciclo térmico y el bloque vuelve a temperatura ambiente.</p>
            <div className="dialog__actions">
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => setConfirmStop(false)} autoFocus>
                Continuar
              </button>
              <button
                type="button"
                className="btn btn--danger btn--lg"
                onClick={() => {
                  simulation.stop();
                  setConfirmStop(false);
                }}
              >
                <Square size={16} aria-hidden="true" />
                Detener
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sin programa cargado ---------- */

function NoProgram() {
  const { goTo } = useApp();
  return (
    <div className="run-empty">
      <FilePlus2 size={40} aria-hidden="true" />
      <h2>No hay ningún programa cargado</h2>
      <p>Crea un protocolo o abre una plantilla y cárgalo en el equipo para iniciar la corrida.</p>
      <button type="button" className="btn btn--primary btn--lg" onClick={() => goTo('program')}>
        <FilePlus2 size={18} aria-hidden="true" />
        Abrir programa
      </button>
    </div>
  );
}

/* ---------- Banner: modo, paso actual y velocidad ---------- */

const RunBanner = memo(function RunBanner() {
  const mode = useSimulation(runMode);
  const phase = useSimulation(s => s.snapshot.phase);
  const stepIndex = useSimulation(s => s.snapshot.stepIndex);
  const step = useSimulation(s => (stepIndex !== undefined ? s.programmed?.cycles.steps[stepIndex] : undefined));
  const name = useSimulation(s => s.programmed?.nombre);
  const { label, tone } = MODE_INFO[mode];

  return (
    <div className="run__banner">
      <span className={`mode mode--${tone}`}>
        <span className="mode__dot" aria-hidden="true" />
        {label}
      </span>
      <p className="run__step">
        <strong>{name}</strong>
        <span>
          {PHASE_LABELS[phase]}
          {phase === 'cycle' && step ? ` · ${step.label || STEP_TYPE_LABELS[step.type]}` : ''}
        </span>
      </p>
      <SpeedSelector />
    </div>
  );
});

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

/* ---------- Lecturas grandes (se actualizan en cada frame) ---------- */

function Readouts() {
  const snapshot = useSimulation(s => s.snapshot);
  const block = useTemperature('block');
  const lid = useTemperature('lid');
  const { phase, targetTemperature: setpoint, totalSeconds, elapsedSeconds } = snapshot;
  const totalCycles = snapshot.totalCycles ?? 0;
  const completedCycles = phase === 'cycle' ? (snapshot.cycleNumber ?? 1) - 1 : ['final_extension', 'hold', 'completed'].includes(phase) ? totalCycles : 0;
  const active = snapshot.state === 'RUNNING' || snapshot.state === 'PAUSED' || phase === 'hold';

  return (
    <div className="readouts">
      <Readout label="Bloque" tone="block" style={cssVars({ '--readout-color': temperatureColor(block, 66) })}>
        <span className="readout__value mono">
          {block.toFixed(1)}
          <small>°C</small>
        </span>
        <span className="readout__sub mono">Consigna {active && setpoint !== undefined ? `${setpoint.toFixed(1)} °C` : '—'}</span>
      </Readout>
      <Readout label="Tapa" tone="lid">
        <span className="readout__value mono">
          {lid.toFixed(1)}
          <small>°C</small>
        </span>
        <span className="readout__sub mono">Consigna {LID_SETPOINT} °C</span>
      </Readout>
      <Readout label="Ciclo" tone="cycle">
        <span className="readout__value mono">
          {phase === 'cycle' ? snapshot.cycleNumber : completedCycles}
          <small>/{totalCycles}</small>
        </span>
        <Bar fraction={totalCycles ? completedCycles / totalCycles : 0} />
      </Readout>
      <Readout label="Resta en paso" tone="step">
        <span className="readout__value mono">{active ? formatClock(snapshot.remainingInPhaseSeconds) : '--:--'}</span>
        <span className="readout__sub">{PHASE_LABELS[phase]}</span>
      </Readout>
      <Readout label="Tiempo restante" tone="total">
        <span className="readout__value mono">{formatClock(totalSeconds - elapsedSeconds)}</span>
        <Bar fraction={snapshot.progressFraction} label={`Transcurrido ${formatClock(elapsedSeconds)}`} />
      </Readout>
    </div>
  );
}

function Readout({ label, tone, style, children }: { label: string; tone: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`readout readout--${tone}`} style={style}>
      <span className="readout__label">{label}</span>
      {children}
    </div>
  );
}

function Bar({ fraction, label }: { fraction: number; label?: string }) {
  return (
    <span className="readout__bar">
      <span className="readout__track" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, fraction))})` }} />
      </span>
      {label && <span className="readout__sub mono">{label}</span>}
    </span>
  );
}

/* ---------- Vistas alternativas del display ---------- */

function LiveProfile() {
  const programmed = useSimulation(s => s.programmed);
  const state = useSimulation(s => s.snapshot.state);
  return programmed && <ThermalProfile protocol={programmed} isDraft={false} active={state !== 'PROGRAMMED'} />;
}

// El color de los pocillos viaja por variable CSS; la placa memorizada
// no se re-renderiza al cambiar la temperatura.
function LivePlate() {
  const block = useTemperature('block');
  const running = useSimulation(s => s.snapshot.state === 'RUNNING');
  return (
    <div style={cssVars({ '--block-color': temperatureColor(block) })}>
      <WellPlate active={running} />
    </div>
  );
}

/* ---------- Transporte ---------- */

const RunControls = memo(function RunControls({ onStop }: { onStop: () => void }) {
  const { goTo } = useApp();
  const state = useSimulation(s => s.snapshot.state);
  const holding = useSimulation(s => s.snapshot.phase === 'hold');
  const running = state === 'RUNNING';
  const canPlay = ['PROGRAMMED', 'PAUSED', 'STOPPED', 'COMPLETED'].includes(state);
  const canStop = running || state === 'PAUSED' || (state === 'COMPLETED' && holding);
  const replay = state === 'COMPLETED' || state === 'STOPPED';

  return (
    <div className="run__controls">
      <button type="button" className="btn btn--ghost btn--lg" onClick={() => goTo('program')} disabled={running}>
        <FilePlus2 size={18} aria-hidden="true" />
        Editar programa
      </button>
      <div className="run__transport">
        <button type="button" className="btn btn--danger-ghost btn--lg" onClick={onStop} disabled={!canStop}>
          <Square size={16} aria-hidden="true" />
          Detener
        </button>
        {running ? (
          <button type="button" className="btn btn--warn btn--xl" onClick={simulation.pause}>
            <Pause size={20} aria-hidden="true" />
            Pausar
          </button>
        ) : (
          <button type="button" className="btn btn--go btn--xl" onClick={simulation.play} disabled={!canPlay}>
            {replay ? <RotateCcw size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
            {state === 'PAUSED' ? 'Reanudar' : replay ? 'Repetir' : 'Iniciar'}
          </button>
        )}
      </div>
    </div>
  );
});
