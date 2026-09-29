import { Suspense, useEffect } from 'react';
import { AppHeader } from './components/AppHeader';
import { useSwipe } from './hooks/useSwipe';
import { AppProvider, useApp } from './state/app';
import { VIEWS, preloadViews, viewIndex } from './views';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

// Armazón: cabecera + vista activa. Deslizar a izquierda/derecha en
// pantallas táctiles cambia de sección en el orden del registro.
function Shell() {
  const { view, goTo } = useApp();
  const index = viewIndex(view);
  const View = VIEWS[index].component;

  const swipe = useSwipe(direction => {
    const next = VIEWS[index + direction];
    if (next) goTo(next.id);
  });

  // Precarga las vistas diferidas cuando el navegador está libre, para
  // que el primer toque en una pestaña sea instantáneo.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(preloadViews);
  }, []);

  // Cada sección empieza arriba del todo.
  useEffect(() => window.scrollTo({ top: 0 }), [index]);

  return (
    <div className="app">
      <AppHeader active={VIEWS[index].id} onNavigate={goTo} />
      <main className="app__main" {...swipe}>
        <Suspense fallback={<p className="loading">Cargando…</p>}>
          <View />
        </Suspense>
      </main>
    </div>
  );
}
