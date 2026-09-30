import { Suspense, useEffect, useRef, useState } from 'react';
import { StatusBar } from './components/device/StatusBar';
import { AppProvider, useApp } from './state/app';
import { KEEP_ALIVE_VIEWS, findView, preloadViews } from './views';

export default function App() {
  return (
    <AppProvider>
      <div className="screen">
        <Screen />
      </div>
    </AppProvider>
  );
}

const loading = <p className="loading">Cargando…</p>;

// Pantalla táctil del equipo a pantalla completa: barra de estado fija +
// pantalla activa, que hace scroll por dentro (no la página entera).
function Screen() {
  const { view } = useApp();
  const current = findView(view);
  const { id } = current;
  const View = current.component;
  const body = useRef<HTMLElement>(null);

  // Las pantallas keepAlive (el termociclador) siguen montadas y ocultas
  // tras la primera visita, para que una corrida no se pare al navegar.
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  const isKeepAlive = KEEP_ALIVE_VIEWS.some(v => v.id === id);
  useEffect(() => {
    if (isKeepAlive) setVisited(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, [id, isKeepAlive]);

  // Precarga las pantallas diferidas cuando el navegador está libre,
  // para que el primer toque en un icono sea instantáneo.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(preloadViews);
  }, []);

  // Cada pantalla empieza arriba del todo.
  useEffect(() => body.current?.scrollTo({ top: 0 }), [id]);

  return (
    <>
      <StatusBar viewId={id} />
      <main ref={body} className={`screen__body screen__body--${id}`}>
        {!isKeepAlive && <Suspense fallback={loading}>{<View />}</Suspense>}
        {KEEP_ALIVE_VIEWS.filter(v => v.id === id || visited.has(v.id)).map(({ id: keepId, component: Kept }) => (
          <div key={keepId} className="keep-alive" hidden={keepId !== id}>
            <Suspense fallback={loading}>
              <Kept />
            </Suspense>
          </div>
        ))}
      </main>
    </>
  );
}
