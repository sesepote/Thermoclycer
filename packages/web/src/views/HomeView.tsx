import { memo } from 'react';
import { BookOpen, ChevronRight, Cpu, FileStack, Flame, Play, Thermometer } from 'lucide-react';
import { protocolDuration } from '@thermocycler/core';
import { PROTOCOL_PRESETS } from '../lib/editorState';
import { formatClock, formatDuration, temperatureColor } from '../lib/format';
import { knowledgeBase } from '../lib/knowledge';
import { PHASE_LABELS, STATE_LABELS } from '../lib/labels';
import { useApp } from '../state/app';
import { LID_SETPOINT, useSimulation, useTemperature } from '../state/simulation';
import { VIEWS } from '.';

// Colores de las esferas satélite, asignados en orden de registro.
const TONES = ['cyan', 'blue', 'emerald', 'amber', 'violet', 'rose'] as const;
// Huecos de la órbita alrededor de la esfera central; el resto de
// pantallas registradas aparecen como accesos en el dock inferior.
const ORBIT_SLOTS = 4;

// Pantalla de inicio del equipo: telemetría arriba, constelación de
// accesos en el centro (Ejecutar en medio) y plantillas + sistema abajo.
// Se genera desde el registro de vistas: una vista nueva aparece sola.
export default function HomeView() {
  const { goTo } = useApp();
  // VIEWS se lee al renderizar (no a nivel de módulo) porque el registro
  // importa esta vista de forma síncrona.
  const shortcuts = VIEWS.filter(v => v.id !== 'home' && v.id !== 'run');
  const orbit = shortcuts.slice(0, ORBIT_SLOTS);
  const extra = shortcuts.slice(ORBIT_SLOTS);

  return (
    <div className="home">
      <Telemetry />

      <nav className="orbit" aria-label="Menú principal">
        <RunSphere onOpen={() => goTo('run')} />
        {orbit.map(({ id, label, description, icon: Icon }, i) => (
          <button key={id} type="button" className={`sphere sphere--${TONES[i % TONES.length]} orbit__sat orbit__sat--${i + 1}`} onClick={() => goTo(id)}>
            <span className="sphere__icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className="sphere__label">{label}</span>
            <span className="sphere__desc">{description}</span>
          </button>
        ))}
      </nav>

      <div className="dock">
        <Templates />
        {extra.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" className="dock-tile" onClick={() => goTo(id)}>
            <span className="dock-tile__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className="dock-tile__text">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
        <SystemInfo />
      </div>
    </div>
  );
}

/* ---------- Telemetría: sensores, programa cargado y corrida ---------- */

function Telemetry() {
  const block = useTemperature('block');
  const lid = useTemperature('lid');
  return (
    <section className="telemetry" aria-label="Estado del equipo">
      <div className="tele tele--block">
        <Thermometer size={18} aria-hidden="true" />
        <span className="tele__label">Bloque</span>
        <span className="tele__value mono" style={{ color: temperatureColor(block, 66) }}>
          {block.toFixed(1)}
          <small>°C</small>
        </span>
      </div>
      <div className="tele tele--lid">
        <Flame size={18} aria-hidden="true" />
        <span className="tele__label">Tapa</span>
        <span className="tele__value mono">
          {lid.toFixed(1)}
          <small>/{LID_SETPOINT} °C</small>
        </span>
      </div>
      <ProgramSummary />
    </section>
  );
}

// Programa cargado y, si hay corrida, su fase y tiempo restante.
function ProgramSummary() {
  const programmed = useSimulation(s => s.programmed);
  const state = useSimulation(s => s.snapshot.state);
  const phase = useSimulation(s => s.snapshot.phase);
  const remaining = useSimulation(s => Math.ceil(s.snapshot.totalSeconds - s.snapshot.elapsedSeconds));
  const active = state === 'RUNNING' || state === 'PAUSED';

  if (!programmed) {
    return (
      <div className="tele tele--program tele--empty">
        <FileStack size={18} aria-hidden="true" />
        <span className="tele__label">Programa</span>
        <span className="tele__text">Sin programa cargado</span>
      </div>
    );
  }
  return (
    <div className="tele tele--program">
      <FileStack size={18} aria-hidden="true" />
      <span className="tele__label">{active ? PHASE_LABELS[phase] : 'Programa cargado'}</span>
      <span className="tele__text">
        <strong>{programmed.nombre}</strong>
        <span className="mono">
          {active ? `resta ${formatClock(remaining)}` : `${programmed.cycles.count} ciclos · ${formatDuration(protocolDuration(programmed))}`}
        </span>
      </span>
    </div>
  );
}

/* ---------- Esfera central: acceso al panel de ejecución ---------- */

const RunSphere = memo(function RunSphere({ onOpen }: { onOpen: () => void }) {
  const state = useSimulation(s => s.snapshot.state);
  const pct = useSimulation(s => Math.floor(s.snapshot.progressFraction * 100));
  const hasProgram = useSimulation(s => s.programmed !== null);
  const running = state === 'RUNNING';

  return (
    <button type="button" className={`sphere sphere--core ${running ? 'is-running' : ''}`} onClick={onOpen}>
      <span className="sphere__halo" aria-hidden="true" />
      <span className="sphere__icon sphere__icon--lg" aria-hidden="true">
        {running ? <Cpu size={34} /> : <Play size={34} />}
      </span>
      <span className="sphere__tag">{STATE_LABELS[state]}</span>
      <span className="sphere__label">Ejecutar</span>
      <span className="sphere__desc">{running || state === 'PAUSED' ? `${pct}% completado` : hasProgram ? 'Abrir panel e iniciar' : 'Panel del termociclador'}</span>
    </button>
  );
});

/* ---------- Dock: plantillas y base de conocimiento ---------- */

function Templates() {
  const { setEditor, goTo } = useApp();
  const locked = useSimulation(s => s.snapshot.state === 'RUNNING');
  return (
    <section className="dock-card" aria-labelledby="templates-title">
      <h2 id="templates-title" className="dock-card__title">
        <FileStack size={16} aria-hidden="true" />
        Abrir plantilla
      </h2>
      <div className="dock-card__list">
        {PROTOCOL_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className="template"
            disabled={locked}
            onClick={() => {
              setEditor(preset.build());
              goTo('program');
            }}
          >
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

const KB_FACTS = [
  { label: 'Primers', value: knowledgeBase.primers.size },
  { label: 'Polimerasas', value: knowledgeBase.polymerases.size },
  { label: 'Reglas', value: knowledgeBase.activeRules().length },
];

function SystemInfo() {
  return (
    <section className="dock-card dock-card--system">
      <h2 className="dock-card__title">
        <BookOpen size={16} aria-hidden="true" />
        Sistema · KB v{knowledgeBase.version}
      </h2>
      <dl className="kb-facts">
        {KB_FACTS.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="kb-facts__note">Datos de demostración</p>
    </section>
  );
}
