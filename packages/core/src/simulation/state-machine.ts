import { Protocol } from '../knowledge/entities/protocol';
import { validateProtocol } from '../calculations/protocol-analysis';
import { calculateTotalRuntime } from '../calculations/protocol-analysis';
import { resolveTiming } from './timing';
import { SimulationSnapshot, SimulationState } from './types';

const ALLOWED_SPEEDS = [1, 2, 5, 10, 100] as const;
export type SimulationSpeed = (typeof ALLOWED_SPEEDS)[number];

// No es un timer: quien la usa (la UI) llama a tick(deltaSegundosReales)
// en cada frame. Aquí solo se lleva la cuenta y se decide el estado.
export class SimulationController {
  private state: SimulationState = 'IDLE';
  private protocol: Protocol | null = null;
  private elapsedSeconds = 0;
  private totalSeconds = 0;
  private speed: SimulationSpeed = 1;
  private errorMessage: string | undefined;

  program(protocol: Protocol): { ok: true } | { ok: false; reason: string } {
    const validation = validateProtocol(protocol);
    if (!validation.valid) {
      this.state = 'ERROR';
      this.errorMessage = validation.issues.map(i => i.message).join('; ');
      return { ok: false, reason: this.errorMessage };
    }

    const runtime = calculateTotalRuntime(protocol);
    this.protocol = protocol;
    this.totalSeconds = runtime.ok ? runtime.result.value : 0;
    this.elapsedSeconds = 0;
    this.errorMessage = undefined;
    this.state = 'PROGRAMMED';
    return { ok: true };
  }

  play(): void {
    if (this.state === 'PROGRAMMED' || this.state === 'PAUSED') this.state = 'RUNNING';
  }

  pause(): void {
    if (this.state === 'RUNNING') this.state = 'PAUSED';
  }

  stop(): void {
    if (!this.protocol) return;
    this.state = 'STOPPED';
    this.elapsedSeconds = 0;
  }

  setSpeed(speed: SimulationSpeed): void {
    this.speed = speed;
  }

  getSpeed(): SimulationSpeed {
    return this.speed;
  }

  getAllowedSpeeds(): readonly SimulationSpeed[] {
    return ALLOWED_SPEEDS;
  }

  tick(realDeltaSeconds: number): void {
    if (this.state !== 'RUNNING' || !this.protocol) return;
    this.elapsedSeconds = Math.min(this.totalSeconds, this.elapsedSeconds + realDeltaSeconds * this.speed);
    if (this.elapsedSeconds >= this.totalSeconds) this.state = 'COMPLETED';
  }

  snapshot(): SimulationSnapshot {
    if (!this.protocol) {
      return {
        state: this.state,
        elapsedSeconds: 0,
        totalSeconds: 0,
        phase: 'idle',
        progressFraction: 0,
        error: this.errorMessage,
      };
    }

    const timing = resolveTiming(this.protocol, this.elapsedSeconds, this.totalSeconds);
    return {
      state: this.state,
      elapsedSeconds: this.elapsedSeconds,
      totalSeconds: this.totalSeconds,
      phase: timing.phase,
      cycleNumber: timing.cycleNumber,
      totalCycles: this.protocol.cycles.count,
      stepIndex: timing.stepIndex,
      targetTemperature: timing.targetTemperature,
      remainingInPhaseSeconds: timing.remainingInPhaseSeconds,
      progressFraction: timing.progressFraction,
      error: this.errorMessage,
    };
  }
}
