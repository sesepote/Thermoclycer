import { BookOpen, ClipboardCheck, Dna, Gauge } from 'lucide-react';
import { SimulationSnapshot } from '@thermocycler/core';
import { StatusPill } from './StatusPill';
import { knowledgeBase } from '../lib/knowledge';

export type AppTab = 'simulator' | 'primers' | 'evaluation' | 'knowledge';

const TABS: { id: AppTab; label: string; icon: typeof Gauge }[] = [
  { id: 'simulator', label: 'Simulador', icon: Gauge },
  { id: 'primers', label: 'Primers', icon: Dna },
  { id: 'evaluation', label: 'Evaluación', icon: ClipboardCheck },
  { id: 'knowledge', label: 'Conocimiento', icon: BookOpen },
];

interface AppHeaderProps {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  snapshot: SimulationSnapshot;
}

export function AppHeader({ tab, onTabChange, snapshot }: AppHeaderProps) {
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
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tabs__item ${tab === id ? 'tabs__item--active' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <StatusPill state={snapshot.state} />
    </header>
  );
}
