import { useSyncExternalStore } from 'react';
import { Protocol, SimulationController, SimulationSnapshot, SimulationSpeed } from '@thermocycler/core';

export const AMBIENT_TEMPERATURE = 25;
export const LID_SETPOINT = 105;

// Constantes de tiempo (en segundos reales) de la aproximación
// exponencial a la consigna: el bloque Peltier es rápido, la tapa lenta.
const BLOCK_TAU = 0.45;
const LID_TAU = 2.5;
const SETTLE_EPSILON = 0.05;

export interface SimulationState {
  snapshot: SimulationSnapshot;
  programmed: Protocol | null; // último protocolo cargado con éxito en el equipo
  speed: SimulationSpeed;
  blockTemperature: number; // lectura "física" del bloque, que rampea hacia la consigna
  lidTemperature: number;
}

// Store externo a React que envuelve al SimulationController del core y
// lleva su propio bucle de requestAnimationFrame. Al vivir fuera del
// árbol, cada frame solo re-renderiza los componentes suscritos al dato
// que cambió (useSimulation con selector), no la aplicación entera.
export class SimulationStore {
  private readonly controller = new SimulationController();
  private readonly listeners = new Set<() => void>();
  private state: SimulationState = {
    snapshot: this.controller.snapshot(),
    programmed: null,
    speed: 1,
    blockTemperature: AMBIENT_TEMPERATURE,
    lidTemperature: AMBIENT_TEMPERATURE,
  };
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
    return result.ok;
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

  /* ---------- Consignas físicas ---------- */

  // El bloque sigue la consigna mientras hay un programa en curso (o en
  // hold); si no, vuelve a temperatura ambiente. La tapa se calienta
  // mientras el programa está en marcha o en pausa.
  private targets() {
    const { state, phase, targetTemperature } = this.state.snapshot;
    const active = state === 'RUNNING' || state === 'PAUSED';
    return {
      block: (active || phase === 'hold') && targetTemperature !== undefined ? targetTemperature : AMBIENT_TEMPERATURE,
      lid: active ? LID_SETPOINT : AMBIENT_TEMPERATURE,
    };
  }

  private settled() {
    const { block, lid } = this.targets();
    return Math.abs(block - this.state.blockTemperature) < SETTLE_EPSILON && Math.abs(lid - this.state.lidTemperature) < SETTLE_EPSILON;
  }

  /* ---------- Internos: publicar estado y reloj ---------- */

  private commit(patch: Partial<SimulationState> = {}) {
    this.state = { ...this.state, ...patch, snapshot: this.controller.snapshot() };
    this.listeners.forEach(l => l());
    this.syncClock();
  }

  // El bucle solo existe mientras la simulación corre o alguna
  // temperatura aún no ha alcanzado su consigna.
  // lastFrameTime solo se reinicia al parar el bucle: así el primer frame
  // tras un arranque no cuenta el tiempo que estuvo parado.
  private syncClock() {
    const needed = this.state.snapshot.state === 'RUNNING' || !this.settled();
    if (needed && !this.frame) {
      this.frame = requestAnimationFrame(this.onFrame);
    } else if (!needed) {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastFrameTime = null;
    }
  }

  private onFrame = (now: number) => {
    this.frame = 0;
    const dt = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.controller.tick(dt);

    const { block, lid } = this.targets();
    const approach = (value: number, target: number, tau: number) =>
      Math.abs(target - value) < SETTLE_EPSILON ? target : value + (target - value) * (1 - Math.exp(-dt / tau));
    this.commit({
      blockTemperature: approach(this.state.blockTemperature, block, BLOCK_TAU),
      lidTemperature: approach(this.state.lidTemperature, lid, LID_TAU),
    });
  };
}

export const simulation = new SimulationStore();

// El selector debe devolver un primitivo o una referencia ya existente
// en el estado (no un objeto nuevo), para que React compare por identidad.
export function useSimulation<T>(selector: (s: SimulationState) => T): T {
  return useSyncExternalStore(simulation.subscribe, () => selector(simulation.getState()));
}

// Lectura redondeada a 0,1 °C: quien la usa solo se re-renderiza cuando
// cambia el dígito que muestra, no en cada frame de la rampa.
export function useTemperature(sensor: 'block' | 'lid'): number {
  return useSimulation(s => Math.round((sensor === 'block' ? s.blockTemperature : s.lidTemperature) * 10) / 10);
}
