import { memo } from 'react';
import { StatusPill } from './StatusPill';
import { knowledgeBase } from '../lib/knowledge';
import { VIEWS, ViewId } from '../views';

interface AppHeaderProps {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
}

// Marca + navegación + estado del equipo. En pantallas estrechas la
// navegación se convierte por CSS en una barra inferior fija, al
// alcance del pulgar.
export const AppHeader = memo(function AppHeader({ active, onNavigate }: AppHeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="header__title">ThermoCycler Sim</p>
          <p className="header__subtitle">Simulador educativo de PCR · KB v{knowledgeBase.version}</p>
        </div>
      </div>

      <nav className="tabs" aria-label="Secciones">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tabs__item ${active === id ? 'tabs__item--active' : ''}`}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <StatusPill />
    </header>
  );
});
