import { ReactNode, memo } from 'react';
import { isActiveRun, useInstrument } from '../../state/instrument';

// Carcasa física del termociclador: marca y LEDs arriba, pantalla
// táctil con marco azul en el centro y frontal (rejilla, bandeja, USB,
// base azul) abajo. En móvil el CSS la oculta y la pantalla ocupa todo
// el viewport, como si el teléfono fuera el propio panel del equipo.
export function Chassis({ children }: { children: ReactNode }) {
  return (
    <div className="bench">
      <div className="chassis">
        <div className="chassis__top">
          <div className="chassis__brand">
            <span className="chassis__logo" aria-hidden="true">
              TC
            </span>
            <div>
              <p className="chassis__model">TC-96 Gradient</p>
              <p className="chassis__sub">Termociclador · 96 pocillos · Peltier</p>
            </div>
          </div>
          <Leds />
        </div>

        <div className="bezel">
          <div className="screen">{children}</div>
        </div>

        <div className="chassis__front" aria-hidden="true">
          <span className="chassis__vents" />
          <span className="chassis__drawer" />
          <span className="chassis__usb">
            <span />
            USB
          </span>
        </div>
        <div className="chassis__base" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ---------- LEDs del frontal: solo cambian con el estado o la tapa ---------- */

const Leds = memo(function Leds() {
  const run = useInstrument(s => s.run);
  const lidHot = useInstrument(s => s.lidTemperature >= s.lidTarget - 1);
  const running = run === 'running' || run === 'preheating_lid' || run === 'holding';
  const lidOn = isActiveRun(run);

  const leds = [
    { label: 'Power', tone: 'ok' },
    { label: 'Tapa', tone: lidOn ? (lidHot ? 'ok' : 'heat') : 'off' },
    { label: running ? 'Run' : 'Standby', tone: running ? 'run' : 'idle' },
  ];

  return (
    <ul className="leds" aria-label="Indicadores del equipo">
      {leds.map(({ label, tone }) => (
        <li key={label} className={`led led--${tone}`}>
          <span className="led__dot" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
});
