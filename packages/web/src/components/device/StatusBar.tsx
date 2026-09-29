import { memo } from 'react';
import { Flame, Home, Thermometer } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { temperatureColor } from '../../lib/format';
import { useApp } from '../../state/app';
import { useTemperature } from '../../state/simulation';
import { findView } from '../../views';
import { StatusPill } from '../StatusPill';

// Barra superior de la pantalla del equipo: botón de inicio, pantalla
// actual, lecturas de bloque y tapa, estado y reloj.
export const StatusBar = memo(function StatusBar({ viewId }: { viewId: string }) {
  const { goTo } = useApp();
  const { id, label, icon: Icon } = findView(viewId);
  const isHome = id === 'home';

  return (
    <header className="statusbar">
      <button type="button" className="statusbar__home" onClick={() => goTo('home')} disabled={isHome} aria-label="Ir a inicio">
        <Home size={20} aria-hidden="true" />
      </button>
      <h1 className="statusbar__title">
        {!isHome && <Icon size={18} aria-hidden="true" />}
        {isHome ? 'TC-96' : label}
      </h1>

      <div className="statusbar__sensors">
        <Sensor sensor="block" />
        <Sensor sensor="lid" />
      </div>
      <StatusPill />
      <Clock />
    </header>
  );
});

function Sensor({ sensor }: { sensor: 'block' | 'lid' }) {
  const temperature = useTemperature(sensor);
  const isBlock = sensor === 'block';
  const Icon = isBlock ? Thermometer : Flame;
  return (
    <span className={`sensor sensor--${sensor}`} title={isBlock ? 'Temperatura del bloque' : 'Temperatura de la tapa'}>
      <Icon size={14} aria-hidden="true" />
      <span className="sensor__label">{isBlock ? 'Bloque' : 'Tapa'}</span>
      <span className="sensor__value mono" style={{ color: isBlock ? temperatureColor(temperature, 66) : undefined }}>
        {temperature.toFixed(1)}°
      </span>
    </span>
  );
}

function Clock() {
  const { time, date } = useClock();
  return (
    <span className="statusbar__clock mono">
      <strong>{time}</strong>
      <small>{date}</small>
    </span>
  );
}
