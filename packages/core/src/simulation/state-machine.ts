import { Protocol } from '../knowledge/entities/protocol';
import { protocolDuration, validateProtocol } from '../calculations/protocol-analysis';
import { resolveTiming } from './timing';
import { SimulationSnapshot, SimulationState } from './types';

const ALLOWED_SPEEDS = [1, 2, 5, 10, 100] as const;
export type SimulationSpeed = (typeof ALLOWED_SPEEDS)[number];

// Máquina de estados de la sección 24. No lleva reloj propio: quien la
// usa llama a tick(segundosReales) en cada frame y aquí solo se lleva
// la cuenta del tiempo simulado y se decide el estado.
export class SimulationController {
  private state: SimulationState = 'IDLE';
  private protocol: Protocol | null = null;
  private elapsedSeconds = 0;
  private totalSeconds = 0;
  private speed: SimulationSpeed = 1;
  private errorMessage: string | undefined;

  /* ---------- Programación ---------- */

  program(protocol: Protocol): { ok: true } | { ok: false; reason: string } {
    const { valid, issues } = validateProtocol(protocol);
    if (!valid) {
      this.state = 'ERROR';
      this.errorMessage = issues.map(i => i.message).join('; ');
      return { ok: false, reason: this.errorMessage };
    }
    this.protocol = protocol;
    this.totalSeconds = protocolDuration(protocol);
    this.elapsedSeconds = 0;
    this.errorMessage = undefined;
    this.state = 'PROGRAMMED';
    return { ok: true };
  }

  /* ---------- Transporte ---------- */

  // Desde STOPPED o COMPLETED vuelve a empezar desde cero.
  play(): void {
    if (!this.protocol) return;
    if (this.state === 'STOPPED' || this.state === 'COMPLETED') this.elapsedSeconds = 0;
    if (this.state !== 'RUNNING' && this.state !== 'ERROR') this.state = 'RUNNING';
  }

  pause(): void {
    if (this.state === 'RUNNING') this.state = 'PAUSED';
  }

  stop(): void {
    if (!this.protocol) return;
    this.state = 'STOPPED';
    this.elapsedSeconds = 0;
  }

  /* ---------- Velocidad ---------- */

  setSpeed(speed: SimulationSpeed): void {
    this.speed = speed;
  }

  getSpeed(): SimulationSpeed {
    return this.speed;
  }

  getAllowedSpeeds(): readonly SimulationSpeed[] {
    return ALLOWED_SPEEDS;
  }

  /* ---------- Avance del tiempo y lectura del estado ---------- */

  tick(realDeltaSeconds: number): void {
    if (this.state !== 'RUNNING' || !this.protocol) return;
    this.elapsedSeconds = Math.min(this.totalSeconds, this.elapsedSeconds + realDeltaSeconds * this.speed);
    if (this.elapsedSeconds >= this.totalSeconds) this.state = 'COMPLETED';
  }

  snapshot(): SimulationSnapshot {
    const base = { state: this.state, error: this.errorMessage };
    if (!this.protocol) return { ...base, elapsedSeconds: 0, totalSeconds: 0, phase: 'idle', progressFraction: 0 };

    return {
      ...base,
      ...resolveTiming(this.protocol, this.elapsedSeconds, this.totalSeconds),
      elapsedSeconds: this.elapsedSeconds,
      totalSeconds: this.totalSeconds,
      totalCycles: this.protocol.cycles.count,
    };
  }
}
