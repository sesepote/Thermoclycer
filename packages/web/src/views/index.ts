import { ComponentType, lazy } from 'react';
import { BookOpen, ClipboardCheck, Dna, Gauge, LucideIcon } from 'lucide-react';
import SimulatorView from './SimulatorView';

// Registro de vistas de la aplicación. Añadir una sección nueva es
// añadir una entrada aquí: la navegación (pestañas, barra inferior,
// gestos de deslizar y rutas #/id) se genera a partir de esta lista.
//
// La vista principal se carga de inicio; el resto va en chunks aparte
// (code splitting) que se precargan en segundo plano tras el arranque.

interface ViewDef {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
  preload?: () => Promise<unknown>;
}

const lazyView = (load: () => Promise<{ default: ComponentType }>) => ({ component: lazy(load), preload: load });

export const VIEWS = [
  { id: 'simulator', label: 'Simulador', icon: Gauge, component: SimulatorView },
  { id: 'primers', label: 'Primers', icon: Dna, ...lazyView(() => import('./PrimerLab')) },
  { id: 'evaluation', label: 'Evaluación', icon: ClipboardCheck, ...lazyView(() => import('./EvaluationView')) },
  { id: 'knowledge', label: 'Conocimiento', icon: BookOpen, ...lazyView(() => import('./KnowledgeView')) },
] as const satisfies readonly ViewDef[];

export type ViewId = (typeof VIEWS)[number]['id'];

// Índice de la vista en la lista; un id desconocido cae en la primera.
export const viewIndex = (id: string) => Math.max(0, VIEWS.findIndex(v => v.id === id));

export const preloadViews = () => VIEWS.forEach(v => 'preload' in v && v.preload());
