import { SourcedValue } from '../../types/common';

export interface Primer {
  id: string;
  nombre: string;
  secuencia: string; // 5' -> 3', IUPAC

  // Estos tres se pueden derivar de la secuencia (Fase 4, motor de cálculo).
  // Aquí solo se modela el hueco donde iría el resultado ya calculado.
  longitud?: SourcedValue<number>;
  porcentajeGC?: SourcedValue<number>;
  tm?: SourcedValue<number>;

  organismo?: string;
  genObjetivo?: string;
  regionObjetivo?: string;
  notas?: string;
  fuente?: string;
  fechaActualizacion?: string;
}
