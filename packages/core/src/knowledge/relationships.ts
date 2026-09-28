export type RelationType =
  | 'tiene_tm'
  | 'tiene_gc'
  | 'amplifica'
  | 'compatible_con'
  | 'rango_operativo'
  | 'requiere'
  | 'usa_protocolo';

export interface Relationship {
  from: string; // id de cualquier entidad
  to: string;
  type: RelationType;
  notas?: string;
}
