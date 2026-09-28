import { useEffect, useRef, useState } from 'react';

const TIME_CONSTANT_SECONDS = 0.45;
const SETTLE_EPSILON = 0.05;

// Solo visual: el core trabaja con temperaturas objetivo instantáneas,
// pero un bloque real tarda en llegar. Esto suaviza la lectura para que
// el panel "rampee" hacia la consigna en vez de saltar.
export function useRampedValue(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;

    const step = (now: number) => {
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      const diff = target - valueRef.current;
      if (Math.abs(diff) < SETTLE_EPSILON) {
        valueRef.current = target;
        setValue(target);
        return;
      }
      valueRef.current += diff * (1 - Math.exp(-dt / TIME_CONSTANT_SECONDS));
      setValue(valueRef.current);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
