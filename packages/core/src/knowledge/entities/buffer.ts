export interface Buffer {
  id: string;
  nombre: string;
  composicion?: Record<string, string>; // ej. { MgCl2: '1.5mM', KCl: '50mM' }
  concentracion?: string;
  compatibilidades?: string[]; // ids de Polymerase
  notas?: string;
  fuente?: string;
}
