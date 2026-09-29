import { TouchEvent, useMemo, useRef } from 'react';

const MIN_DISTANCE_PX = 80;
const MAX_DURATION_MS = 600;

// Elementos donde un deslizamiento horizontal tiene otro significado
// (escribir, desplazar una tabla, inspeccionar la gráfica...).
const IGNORE = 'input, textarea, select, [data-no-swipe]';

// Detecta un deslizamiento horizontal rápido con un dedo y llama a
// onSwipe(+1) hacia la izquierda (siguiente) o onSwipe(-1) hacia la
// derecha (anterior). Los gestos verticales se dejan al scroll.
export function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const callback = useRef(onSwipe);
  callback.current = onSwipe;

  return useMemo(() => {
    let start: { x: number; y: number; time: number } | null = null;
    return {
      onTouchStart(e: TouchEvent) {
        const ignored = e.touches.length !== 1 || (e.target as Element).closest(IGNORE);
        const t = e.touches[0];
        start = ignored ? null : { x: t.clientX, y: t.clientY, time: e.timeStamp };
      },
      onTouchEnd(e: TouchEvent) {
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const quick = e.timeStamp - start.time < MAX_DURATION_MS;
        start = null;
        if (quick && Math.abs(dx) > MIN_DISTANCE_PX && Math.abs(dx) > 2 * Math.abs(dy)) callback.current(dx < 0 ? 1 : -1);
      },
    };
  }, []);
}
