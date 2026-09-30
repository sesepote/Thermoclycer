export interface GradientConfig {
  enabled: boolean;
  lowTemp: number;   // e.g. 50.0 °C (Column 1)
  highTemp: number;  // e.g. 60.0 °C (Column 12)
}

export interface PCRStep {
  id: string;
  name: string;
  temperature: number; // in Celsius (e.g. 95.0)
  durationSeconds: number; // e.g. 180 for 3m, 0 for infinite hold
  isInfiniteHold?: boolean;
  rampRate?: number; // °C/s (default 3.5 - 4.0)
  gradient?: GradientConfig;
  tempIncrement?: number; // °C/cycle (e.g. -0.5 for touchdown)
  timeIncrement?: number; // sec/cycle (e.g. +5s for long PCR)
}

export interface PCRCycleLoop {
  id: string;
  startStepIndex: number; // 0-based index
  endStepIndex: number;   // 0-based index
  repeatCount: number;    // e.g. 30 or 35 cycles
}

export interface PCRProtocol {
  id: string;
  name: string;
  description: string;
  lidTemperature: number; // e.g. 105.0 °C
  lidHeatingEnabled: boolean;
  sampleVolume: number;   // in µL, e.g. 50
  steps: PCRStep[];
  loops: PCRCycleLoop[];
  createdAt: string;
  isPreset?: boolean;
}

export type MachineRunState = 'idle' | 'preheating_lid' | 'running' | 'paused' | 'holding' | 'completed';

export interface RunProgressState {
  state: MachineRunState;
  currentStepIndex: number;
  currentCycle: number;
  totalCyclesInCurrentLoop: number;
  loopId: string | null;
  stepElapsedSeconds: number;
  stepRemainingSeconds: number;
  totalElapsedSeconds: number;
  estimatedRemainingSeconds: number;
  currentBlockTemp: number;
  targetBlockTemp: number;
  currentLidTemp: number;
  targetLidTemp: number;
  isRamping: boolean;
  rampVelocity: number; // °C/s current
  simSpeed: number; // 1, 5, 20, 60
}

export type ModalType = 
  | null 
  | 'temp_numpad' 
  | 'time_numpad' 
  | 'gradient' 
  | 'cycle_loop' 
  | 'protocol_library' 
  | 'settings' 
  | 'well_plate' 
  | 'confirm_stop';
