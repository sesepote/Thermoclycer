import { useSyncExternalStore } from 'react';
import type { MachineRunState, PCRProtocol } from '../cycler/types/pcr';

// Estado publicado por el termociclador (cycler/CyclerApp) para el resto
// de la interfaz: barra de estado, LEDs de la carcasa e inicio. También
// lleva la petición de carga de un programa enviado desde el editor.

export interface InstrumentState {
  run: MachineRunState;
  blockTemperature: number;
  lidTemperature: number;
  lidTarget: number;
  protocolName: string | null;
  stepName: string | null;
  cycle: number;
  totalCycles: number;
  remainingSeconds: number;
  progress: number; // 0..1
  loadRequest: PCRProtocol | null;
}

export type InstrumentReadings = Omit<InstrumentState, 'loadRequest'>;

export const isActiveRun = (run: MachineRunState) => run !== 'idle' && run !== 'completed';

class InstrumentStore {
  private readonly listeners = new Set<() => void>();
  private state: InstrumentState = {
    run: 'idle',
    blockTemperature: 25,
    lidTemperature: 25,
    lidTarget: 105,
    protocolName: null,
    stepName: null,
    cycle: 0,
    totalCycles: 0,
    remainingSeconds: 0,
    progress: 0,
    loadRequest: null,
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getState = () => this.state;

  // El equipo publica en cada tick (10/s); solo se notifica si algo cambió.
  publish(readings: InstrumentReadings) {
    const changed = (Object.keys(readings) as (keyof InstrumentReadings)[]).some(k => readings[k] !== this.state[k]);
    if (changed) this.set(readings);
  }

  // El editor envía un programa; el equipo lo recoge al montarse o al instante si ya está montado.
  requestLoad = (protocol: PCRProtocol) => this.set({ loadRequest: protocol });

  takeLoadRequest(): PCRProtocol | null {
    const request = this.state.loadRequest;
    if (request) this.set({ loadRequest: null });
    return request;
  }

  private set(patch: Partial<InstrumentState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }
}

export const instrument = new InstrumentStore();

// El selector debe devolver un primitivo o una referencia existente.
export function useInstrument<T>(selector: (s: InstrumentState) => T): T {
  return useSyncExternalStore(instrument.subscribe, () => selector(instrument.getState()));
}
