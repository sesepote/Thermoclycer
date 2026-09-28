import { useEffect, useRef } from 'react';
import { SimulationController, SimulationSnapshot } from '@thermocycler/core';

// No es más que un bucle de requestAnimationFrame que llama a
// controller.tick() con el tiempo real transcurrido. Toda la lógica de
// "qué significa ese tiempo" vive en core; esto solo lleva el reloj.
export function useSimulationClock(
  controller: SimulationController,
  running: boolean,
  onTick: (snapshot: SimulationSnapshot) => void,
): void {
  const lastTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (now - lastTimeRef.current) / 1000;
        controller.tick(deltaSeconds);
        onTick(controller.snapshot());
      }
      lastTimeRef.current = now;
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [running, controller, onTick]);
}
