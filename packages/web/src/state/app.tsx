import { Dispatch, ReactNode, SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Protocol } from '@thermocycler/core';
import { EditorState, buildProtocol, defaultEditorState, protocolToEditorState } from '../lib/editorState';
import type { ViewId } from '../views';

// Estado compartido de baja frecuencia: vista activa y borrador del
// editor. La simulación (que cambia en cada frame) va aparte, en
// state/simulation.ts, para no re-renderizar a todos los consumidores.

interface AppContextValue {
  view: string; // id crudo del hash; App lo resuelve contra el registro de vistas
  goTo: (view: ViewId) => void;
  editor: EditorState;
  setEditor: Dispatch<SetStateAction<EditorState>>;
  draft: Protocol;
  annealingTemperature?: number;
  loadProtocol: (protocol: Protocol) => void;
  applyAnnealing: (temperature: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// La vista activa vive en el hash (#/primers): es enlazable y el botón
// "atrás" del móvil navega entre secciones.
const viewFromHash = () => location.hash.replace(/^#\/?/, '');

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState(viewFromHash);
  const [editor, setEditor] = useState(defaultEditorState);
  const draft = useMemo(() => buildProtocol(editor), [editor]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const goTo = useCallback((next: ViewId) => {
    location.hash = `/${next}`;
  }, []);

  const loadProtocol = useCallback(
    (protocol: Protocol) => {
      setEditor(protocolToEditorState(protocol));
      goTo('program');
    },
    [goTo],
  );

  const applyAnnealing = useCallback(
    (temperature: number) => {
      setEditor(prev => ({ ...prev, steps: prev.steps.map(s => (s.type === 'annealing' ? { ...s, temperature } : s)) }));
      goTo('program');
    },
    [goTo],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      view,
      goTo,
      editor,
      setEditor,
      draft,
      annealingTemperature: editor.steps.find(s => s.type === 'annealing')?.temperature,
      loadProtocol,
      applyAnnealing,
    }),
    [view, goTo, editor, draft, loadProtocol, applyAnnealing],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
