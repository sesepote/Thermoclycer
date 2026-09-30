import { memo } from 'react';
import { BookOpen, ChevronRight, Cpu, FileStack, Flame, Play, Thermometer } from 'lucide-react';
import { PROTOCOL_PRESETS } from '../lib/editorState';
import { formatClock, temperatureColor } from '../lib/format';
import { knowledgeBase } from '../lib/knowledge';
import { RUN_LABELS } from '../lib/labels';
import { useApp } from '../state/app';
import { isActiveRun, useInstrument } from '../state/instrument';
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
  const block = useInstrument(s => s.blockTemperature);
  const lid = useInstrument(s => s.lidTemperature);
  const lidTarget = useInstrument(s => s.lidTarget);
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
          <small>/{lidTarget} °C</small>
        </span>
      </div>
      <ProgramSummary />
    </section>
  );
}

// Programa del equipo y, si hay corrida, el paso, el ciclo y el tiempo restante.
function ProgramSummary() {
  const name = useInstrument(s => s.protocolName);
  const run = useInstrument(s => s.run);
  const step = useInstrument(s => s.stepName);
  const cycle = useInstrument(s => s.cycle);
  const cycles = useInstrument(s => s.totalCycles);
  const remaining = useInstrument(s => s.remainingSeconds);
  const active = isActiveRun(run);

  return (
    <div className={`tele tele--program ${name ? '' : 'tele--empty'}`}>
      <FileStack size={18} aria-hidden="true" />
      <span className="tele__label">{active ? `${RUN_LABELS[run]} · ${step ?? ''}` : 'Programa en el equipo'}</span>
      <span className="tele__text">
        <strong>{name ?? 'Abre el termociclador para ver su programa'}</strong>
        {name && <span className="mono">{active ? `ciclo ${cycle}/${cycles} · resta ${formatClock(remaining)}` : `${cycles} ciclos`}</span>}
      </span>
    </div>
  );
}

/* ---------- Esfera central: acceso al panel de ejecución ---------- */

const RunSphere = memo(function RunSphere({ onOpen }: { onOpen: () => void }) {
  const run = useInstrument(s => s.run);
  const pct = useInstrument(s => Math.floor(s.progress * 100));
  const active = isActiveRun(run);
  const running = active && run !== 'paused';

  return (
    <button type="button" className={`sphere sphere--core ${running ? 'is-running' : ''}`} onClick={onOpen}>
      <span className="sphere__halo" aria-hidden="true" />
      <span className="sphere__icon sphere__icon--lg" aria-hidden="true">
        {running ? <Cpu size={34} /> : <Play size={34} />}
      </span>
      <span className="sphere__tag">{RUN_LABELS[run]}</span>
      <span className="sphere__label">Termociclador</span>
      <span className="sphere__desc">{active ? `${pct}% completado` : 'Programar y ejecutar'}</span>
    </button>
  );
});

/* ---------- Dock: plantillas y base de conocimiento ---------- */

function Templates() {
  const { setEditor, goTo } = useApp();
  const locked = useInstrument(s => isActiveRun(s.run));
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
