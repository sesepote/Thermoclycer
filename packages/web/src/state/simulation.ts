import { useSyncExternalStore } from 'react';
import { Protocol, SimulationController, SimulationSnapshot, SimulationSpeed } from '@thermocycler/core';

export interface SimulationState {
  snapshot: SimulationSnapshot;
  programmed: Protocol | null; // último protocolo cargado con éxito en el equipo
  speed: SimulationSpeed;
}

// Store externo a React que envuelve al SimulationController del core y
// lleva su propio bucle de requestAnimationFrame. Al vivir fuera del
// árbol, cada frame solo re-renderiza los componentes suscritos al dato
// que cambió (useSimulation con selector), no la aplicación entera.
export class SimulationStore {
  private readonly controller = new SimulationController();
  private readonly listeners = new Set<() => void>();
  private state: SimulationState = { snapshot: this.controller.snapshot(), programmed: null, speed: 1 };
  private frame = 0;
  private lastFrameTime: number | null = null;
  readonly speeds = this.controller.getAllowedSpeeds();

  /* ---------- Contrato de useSyncExternalStore ---------- */

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getState = () => this.state;

  /* ---------- Acciones ---------- */

  program = (protocol: Protocol) => {
    const result = this.controller.program(protocol);
    this.commit({ programmed: result.ok ? protocol : null });
  };

  play = () => {
    this.controller.play();
    this.commit();
  };

  pause = () => {
    this.controller.pause();
    this.commit();
  };

  stop = () => {
    this.controller.stop();
    this.commit();
  };

  setSpeed = (speed: SimulationSpeed) => {
    this.controller.setSpeed(speed);
    this.commit({ speed });
  };

  /* ---------- Internos: publicar estado y reloj ---------- */

  private commit(patch: Partial<SimulationState> = {}) {
    this.state = { ...this.state, ...patch, snapshot: this.controller.snapshot() };
    this.listeners.forEach(l => l());
    this.syncClock();
  }

  // El bucle solo existe mientras la simulación está en marcha.
  private syncClock() {
    const running = this.state.snapshot.state === 'RUNNING';
    if (running && !this.frame) {
      this.lastFrameTime = null;
      this.frame = requestAnimationFrame(this.onFrame);
    } else if (!running && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private onFrame = (now: number) => {
    this.frame = 0;
    const delta = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.controller.tick(delta);
    this.commit();
  };
}

export const simulation = new SimulationStore();

// El selector debe devolver un primitivo o una referencia ya existente
// en el estado (no un objeto nuevo), para que React compare por identidad.
export function useSimulation<T>(selector: (s: SimulationState) => T): T {
  return useSyncExternalStore(simulation.subscribe, () => selector(simulation.getState()));
}
