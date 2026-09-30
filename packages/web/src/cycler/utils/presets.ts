import { PCRProtocol } from '../types/pcr';

export const DEFAULT_T5000_PROTOCOL: PCRProtocol = {
  id: 'preset_t5000_gradient',
  name: 'GRADIENT_T5000_96',
  description: 'Programa oficial con gradiente térmico de 50.0°C a 60.0°C en paso de alineamiento.',
  lidTemperature: 105.0,
  lidHeatingEnabled: true,
  sampleVolume: 50,
  createdAt: '2026-09-28',
  isPreset: true,
  steps: [
    {
      id: 'step_1',
      name: 'Desnaturalización Inicial',
      temperature: 95.0,
      durationSeconds: 180, // 3 min
      rampRate: 4.0,
    },
    {
      id: 'step_2',
      name: 'Desnaturalización',
      temperature: 95.0,
      durationSeconds: 30, // 30 sec
      rampRate: 4.0,
    },
    {
      id: 'step_3',
      name: 'Alineamiento (Gradiente)',
      temperature: 55.0,
      durationSeconds: 30, // 30 sec
      rampRate: 3.5,
      gradient: {
        enabled: true,
        lowTemp: 50.0,
        highTemp: 60.0,
      },
    },
    {
      id: 'step_4',
      name: 'Extensión',
      temperature: 72.0,
      durationSeconds: 60, // 1 min
      rampRate: 3.5,
    },
    {
      id: 'step_5',
      name: 'Extensión Final',
      temperature: 72.0,
      durationSeconds: 300, // 5 min
      rampRate: 4.0,
    },
    {
      id: 'step_6',
      name: 'Conservación 4°C',
      temperature: 4.0,
      durationSeconds: 0,
      isInfiniteHold: true,
      rampRate: 3.0,
    },
  ],
  loops: [
    {
      id: 'loop_1',
      startStepIndex: 1, // step 2
      endStepIndex: 3,   // step 4
      repeatCount: 35,
    },
  ],
};

export const PCR_PRESETS: PCRProtocol[] = [
  DEFAULT_T5000_PROTOCOL,
  {
    id: 'preset_standard_taq',
    name: 'STANDARD_TAQ_30X',
    description: 'Protocolo estándar de 3 pasos (95°C / 58°C / 72°C) x 30 ciclos.',
    lidTemperature: 105.0,
    lidHeatingEnabled: true,
    sampleVolume: 50,
    createdAt: '2026-09-28',
    isPreset: true,
    steps: [
      { id: 'st_1', name: 'Desnat. Inicial', temperature: 95.0, durationSeconds: 120, rampRate: 4.0 },
      { id: 'st_2', name: 'Desnaturalización', temperature: 95.0, durationSeconds: 30, rampRate: 4.0 },
      { id: 'st_3', name: 'Alineamiento', temperature: 58.0, durationSeconds: 30, rampRate: 3.5 },
      { id: 'st_4', name: 'Extensión', temperature: 72.0, durationSeconds: 45, rampRate: 3.5 },
      { id: 'st_5', name: 'Extensión Final', temperature: 72.0, durationSeconds: 300, rampRate: 4.0 },
      { id: 'st_6', name: 'Mantenimiento', temperature: 4.0, durationSeconds: 0, isInfiniteHold: true, rampRate: 3.0 },
    ],
    loops: [{ id: 'loop_std', startStepIndex: 1, endStepIndex: 3, repeatCount: 30 }],
  },
  {
    id: 'preset_touchdown',
    name: 'TOUCHDOWN_PCR_HIGH',
    description: 'Touchdown decrece -0.5°C por ciclo en la fase inicial para máxima especificidad.',
    lidTemperature: 105.0,
    lidHeatingEnabled: true,
    sampleVolume: 25,
    createdAt: '2026-09-28',
    isPreset: true,
    steps: [
      { id: 'td_1', name: 'Hot Start Denat', temperature: 95.0, durationSeconds: 180, rampRate: 4.0 },
      { id: 'td_2', name: 'Desnat Ciclo', temperature: 95.0, durationSeconds: 20, rampRate: 4.0 },
      { id: 'td_3', name: 'Anneal Touchdown', temperature: 65.0, durationSeconds: 30, rampRate: 3.5, tempIncrement: -0.5 },
      { id: 'td_4', name: 'Extensión', temperature: 72.0, durationSeconds: 45, rampRate: 3.5 },
      { id: 'td_5', name: 'Extensión Final', temperature: 72.0, durationSeconds: 420, rampRate: 4.0 },
      { id: 'td_6', name: 'Mantenimiento 4°C', temperature: 4.0, durationSeconds: 0, isInfiniteHold: true, rampRate: 3.0 },
    ],
    loops: [{ id: 'loop_td', startStepIndex: 1, endStepIndex: 3, repeatCount: 28 }],
  },
  {
    id: 'preset_fast_2step',
    name: 'FAST_2STEP_QPCR',
    description: 'Protocolo rápido de 2 pasos (95°C / 60°C) optimizado para amplicones cortos.',
    lidTemperature: 105.0,
    lidHeatingEnabled: true,
    sampleVolume: 20,
    createdAt: '2026-09-28',
    isPreset: true,
    steps: [
      { id: 'f_1', name: 'Activación Taq', temperature: 95.0, durationSeconds: 60, rampRate: 4.5 },
      { id: 'f_2', name: 'Desnaturalización', temperature: 95.0, durationSeconds: 5, rampRate: 4.5 },
      { id: 'f_3', name: 'Anneal & Extension', temperature: 60.0, durationSeconds: 30, rampRate: 4.0 },
      { id: 'f_4', name: 'Mantenimiento 4°C', temperature: 4.0, durationSeconds: 0, isInfiniteHold: true, rampRate: 3.0 },
    ],
    loops: [{ id: 'loop_fast', startStepIndex: 1, endStepIndex: 2, repeatCount: 40 }],
  },
  {
    id: 'preset_colony',
    name: 'COLONY_SCREEN_LYSIS',
    description: 'Lisis celular directa a 98°C por 10 min seguido de amplificación de colonias.',
    lidTemperature: 105.0,
    lidHeatingEnabled: true,
    sampleVolume: 25,
    createdAt: '2026-09-28',
    isPreset: true,
    steps: [
      { id: 'col_1', name: 'Lisis Bacteriana', temperature: 98.0, durationSeconds: 600, rampRate: 4.0 },
      { id: 'col_2', name: 'Desnaturalización', temperature: 95.0, durationSeconds: 30, rampRate: 4.0 },
      { id: 'col_3', name: 'Alineamiento', temperature: 53.0, durationSeconds: 30, rampRate: 3.5 },
      { id: 'col_4', name: 'Extensión', temperature: 72.0, durationSeconds: 75, rampRate: 3.5 },
      { id: 'col_5', name: 'Extensión Final', temperature: 72.0, durationSeconds: 600, rampRate: 4.0 },
      { id: 'col_6', name: 'Hold 4°C', temperature: 4.0, durationSeconds: 0, isInfiniteHold: true, rampRate: 3.0 },
    ],
    loops: [{ id: 'loop_col', startStepIndex: 1, endStepIndex: 3, repeatCount: 32 }],
  },
  {
    id: 'preset_rt_pcr',
    name: 'ONE_STEP_RT_PCR',
    description: 'Transcripción reversa inicial a 50°C por 15 min seguida de PCR estándar.',
    lidTemperature: 105.0,
    lidHeatingEnabled: true,
    sampleVolume: 50,
    createdAt: '2026-09-28',
    isPreset: true,
    steps: [
      { id: 'rt_1', name: 'Síntesis cDNA (RT)', temperature: 50.0, durationSeconds: 900, rampRate: 3.0 },
      { id: 'rt_2', name: 'Inactivación RT / Denat', temperature: 95.0, durationSeconds: 120, rampRate: 4.0 },
      { id: 'rt_3', name: 'Desnaturalización', temperature: 95.0, durationSeconds: 15, rampRate: 4.0 },
      { id: 'rt_4', name: 'Alineamiento', temperature: 56.0, durationSeconds: 20, rampRate: 3.5 },
      { id: 'rt_5', name: 'Extensión', temperature: 72.0, durationSeconds: 30, rampRate: 3.5 },
      { id: 'rt_6', name: 'Extensión Final', temperature: 72.0, durationSeconds: 300, rampRate: 4.0 },
      { id: 'rt_7', name: 'Mantenimiento', temperature: 4.0, durationSeconds: 0, isInfiniteHold: true, rampRate: 3.0 },
    ],
    loops: [{ id: 'loop_rt', startStepIndex: 2, endStepIndex: 4, repeatCount: 35 }],
  },
];
