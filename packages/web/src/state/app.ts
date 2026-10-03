import { SetStateAction } from 'react';
import { create } from 'zustand';
import { Protocol } from '@thermocycler/core';
import { useCyclerStore } from '../cycler/store';
import { EditorState, buildProtocol, defaultEditorState, protocolToEditorState } from '../lib/editorState';
import { fromCyclerProtocol } from '../lib/toCycler';
import type { ViewId } from '../views';

// Estado compartido de baja frecuencia: vista activa y borrador del
// editor. Las lecturas del equipo (que cambian 10 veces por segundo) van
// aparte, en state/instrument.ts. Cada componente se suscribe con un
// selector y solo se re-renderiza si cambia lo que usa.

interface AppState {
  view: string; // id crudo del hash; App lo resuelve contra el registro de vistas
  editor: EditorState;
  dirty: boolean; // el usuario ya tocó el borrador; no se pisa con el programa del equipo
  draft: Protocol;
  annealingTemperature?: number;
  goTo: (view: ViewId) => void;
  setEditor: (update: SetStateAction<EditorState>) => void;
  seedEditor: (editor: EditorState) => void;
  loadProtocol: (protocol: Protocol) => void;
  applyAnnealing: (temperature: number) => void;
}

// La vista activa vive en el hash (#/primers): es enlazable y el botón
// "atrás" del móvil navega entre secciones.
const viewFromHash = () => location.hash.replace(/^#\/?/, '');

const withDraft = (editor: EditorState) => ({
  editor,
  draft: buildProtocol(editor),
  annealingTemperature: editor.steps.find(s => s.type === 'annealing')?.temperature,
});

export const useApp = create<AppState>((set, get) => ({
  view: viewFromHash(),
  dirty: false,
  ...withDraft(defaultEditorState()),
  goTo: next => {
    location.hash = `/${next}`;
  },
  setEditor: update => set(s => ({ dirty: true, ...withDraft(typeof update === 'function' ? update(s.editor) : update) })),
  seedEditor: editor => set(withDraft(editor)),
  loadProtocol: protocol => {
    set({ dirty: true, ...withDraft(protocolToEditorState(protocol)) });
    get().goTo('program');
  },
  applyAnnealing: temperature => {
    get().setEditor(prev => ({ ...prev, steps: prev.steps.map(s => (s.type === 'annealing' ? { ...s, temperature } : s)) }));
    get().goTo('program');
  },
}));

addEventListener('hashchange', () => useApp.setState({ view: viewFromHash() }));

// Al arrancar, el borrador del editor refleja el programa guardado en el
// equipo. Si el usuario ya editó, no se sustituye.
const seedFromMachine = () => {
  if (useApp.getState().dirty) return;
  useApp.getState().seedEditor(fromCyclerProtocol(useCyclerStore.getState().protocol));
};
if (useCyclerStore.persist.hasHydrated()) seedFromMachine();
else useCyclerStore.persist.onFinishHydration(seedFromMachine);
