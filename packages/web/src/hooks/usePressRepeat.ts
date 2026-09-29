import { MouseEvent, PointerEvent, useEffect, useRef } from 'react';

const FIRST_DELAY_MS = 400;
const MIN_DELAY_MS = 40;
const ACCELERATION = 0.8;

// Botón que repite su acción mientras se mantiene pulsado, cada vez más
// rápido. En pantallas táctiles evita tener que teclear números: se
// deja el dedo sobre "+" y el valor avanza solo.
//
// El puntero (ratón, dedo, lápiz) actúa en pointerdown; el click solo
// se atiende si viene del teclado (detail === 0), para no duplicar.
export function usePressRepeat(action: () => void, disabled = false) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const timer = useRef<number>();

  const stop = () => window.clearTimeout(timer.current);

  useEffect(() => {
    if (disabled) stop();
    return stop;
  }, [disabled]);

  return {
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (disabled || e.button !== 0) return;
      actionRef.current();
      let delay = FIRST_DELAY_MS;
      const repeat = () => {
        actionRef.current();
        delay = Math.max(MIN_DELAY_MS, delay * ACCELERATION);
        timer.current = window.setTimeout(repeat, delay);
      };
      timer.current = window.setTimeout(repeat, delay);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop, // p. ej. cuando el navegador decide que el gesto era un scroll
    onClick(e: MouseEvent<HTMLButtonElement>) {
      if (e.detail === 0) actionRef.current();
    },
    onContextMenu: (e: MouseEvent) => e.preventDefault(), // la pulsación larga no abre el menú contextual
  };
}
