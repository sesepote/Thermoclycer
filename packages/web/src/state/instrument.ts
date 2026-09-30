import { create } from 'zustand';
import type { MachineRunState } from '../cycler/types/pcr';

// Lecturas que el termociclador (cycler/CyclerApp) publica para el resto
// de la interfaz: barra de estado e inicio. Los componentes se suscriben
// con selectores, así que solo se re-renderizan si cambia lo que muestran.

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
}

export const isActiveRun = (run: MachineRunState) => run !== 'idle' && run !== 'completed';

export const useInstrument = create<InstrumentState>(() => ({
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
}));

export const publishReadings = (readings: InstrumentState) => useInstrument.setState(readings);
