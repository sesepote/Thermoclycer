import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PCRProtocol } from './types/pcr';
import { DEFAULT_T5000_PROTOCOL } from './utils/presets';

// Programa cargado en el equipo y biblioteca del usuario, guardados en
// localStorage. El editor de protocolo escribe aquí para cargar un programa.

type Update<T> = T | ((prev: T) => T);
const apply = <T,>(update: Update<T>, prev: T) => (typeof update === 'function' ? (update as (p: T) => T)(prev) : update);

interface CyclerStore {
  protocol: PCRProtocol;
  userProtocols: PCRProtocol[];
  setProtocol: (update: Update<PCRProtocol>) => void;
  setUserProtocols: (update: Update<PCRProtocol[]>) => void;
}

export const useCyclerStore = create<CyclerStore>()(
  persist(
    set => ({
      protocol: DEFAULT_T5000_PROTOCOL,
      userProtocols: [],
      setProtocol: update => set(s => ({ protocol: apply(update, s.protocol) })),
      setUserProtocols: update => set(s => ({ userProtocols: apply(update, s.userProtocols) })),
    }),
    { name: 't5000_cycler', partialize: ({ protocol, userProtocols }) => ({ protocol, userProtocols }) },
  ),
);
