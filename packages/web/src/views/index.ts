import { ComponentType, lazy } from 'react';
import { BookOpen, ClipboardCheck, Dna, FilePlus2, Home, LucideIcon, Play } from 'lucide-react';
import HomeView from './HomeView';

// Registro de pantallas del equipo. Añadir una opción es añadir una
// entrada: aparece sola como icono en la pantalla de inicio, tiene su
// ruta #/id y su título en la barra de estado.
//
// Inicio se carga de entrada; el resto va en chunks aparte (code
// splitting) que se precargan en segundo plano tras el arranque.

interface ViewDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType;
  preload?: () => Promise<unknown>;
  keepAlive?: boolean; // sigue montada (oculta) al salir: el equipo no se para al navegar
}

const lazyView = (load: () => Promise<{ default: ComponentType }>) => ({ component: lazy(load), preload: load });

export const VIEWS = [
  { id: 'home', label: 'Inicio', description: 'Pantalla principal', icon: Home, component: HomeView },
  { id: 'program', label: 'Programa', description: 'Editar protocolo y plantillas', icon: FilePlus2, ...lazyView(() => import('./ProgramView')) },
  { id: 'run', label: 'Termociclador', description: 'Panel del termociclador', icon: Play, keepAlive: true, ...lazyView(() => import('./RunView')) },
  { id: 'primers', label: 'Primers', description: 'Tm, GC e hibridación', icon: Dna, ...lazyView(() => import('./PrimerLab')) },
  { id: 'evaluation', label: 'Evaluación', description: 'Comparar con la referencia', icon: ClipboardCheck, ...lazyView(() => import('./EvaluationView')) },
  { id: 'knowledge', label: 'Sistema', description: 'Base de conocimiento y reglas', icon: BookOpen, ...lazyView(() => import('./KnowledgeView')) },
] as const satisfies readonly ViewDef[];

export type ViewId = (typeof VIEWS)[number]['id'];

// Pantalla por id; un id desconocido lleva a Inicio.
export const findView = (id: string) => VIEWS.find(v => v.id === id) ?? VIEWS[0];

export const KEEP_ALIVE_VIEWS = VIEWS.filter(v => 'keepAlive' in v && v.keepAlive);

export const preloadViews = () => VIEWS.forEach(v => 'preload' in v && v.preload());
