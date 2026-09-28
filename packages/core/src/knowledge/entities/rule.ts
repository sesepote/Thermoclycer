import { Condition } from '../../rules/condition';
import { Action } from '../../rules/action';

// La forma de "condiciones" y "accion" ya no es unknown: se definió al
// construir el motor de reglas (Fase 3). Una regla puede disparar más
// de una acción, por eso accion admite un array.

export interface Rule {
  id: string;
  nombre: string;
  descripcion?: string;
  prioridad: number;
  condiciones: Condition;
  accion: Action | Action[];
  parametros?: Record<string, unknown>;
  fuente?: string;
  version: string;
  activa: boolean;
}
