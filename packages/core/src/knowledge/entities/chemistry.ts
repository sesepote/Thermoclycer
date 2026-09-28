export interface Chemistry {
  id: string;
  nombre: string;
  tipo: string; // ej. "SYBR Green", "TaqMan", "end-point"
  descripcion?: string;
  componentes?: string[];
  restricciones?: string[];
  fuente?: string;
}
