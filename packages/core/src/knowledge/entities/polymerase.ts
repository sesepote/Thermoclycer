import { SourcedValue } from '../../types/common';

export interface TemperatureRange {
  min: number;
  max: number;
  unit: 'C';
}

export interface Polymerase {
  id: string;
  nombre: string;
  tipo: string; // ej. "hot-start", "high-fidelity"
  fabricante?: string;
  temperaturaRecomendada?: SourcedValue<number>; // temp. de extensión, °C
  rangoTemperatura?: TemperatureRange;
  velocidadExtension?: SourcedValue<number>; // segundos por kb, según fabricante
  requisitos?: string[];
  buffersCompatibles?: string[]; // ids de Buffer
  notas?: string;
  fuente?: string;
}
