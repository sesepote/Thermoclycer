import { Suspense, useEffect, useRef } from 'react';
import { Chassis } from './components/device/Chassis';
import { StatusBar } from './components/device/StatusBar';
import { AppProvider, useApp } from './state/app';
import { findView, preloadViews } from './views';

export default function App() {
  return (
    <AppProvider>
      <Chassis>
        <Screen />
      </Chassis>
    </AppProvider>
  );
}

// Pantalla táctil del equipo: barra de estado fija + pantalla activa,
// que hace scroll dentro del marco (no la página entera).
function Screen() {
  const { view } = useApp();
  const { id, component: View } = findView(view);
  const body = useRef<HTMLElement>(null);

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
        <Suspense fallback={<p className="loading">Cargando…</p>}>
          <View />
        </Suspense>
      </main>
    </>
  );
}
