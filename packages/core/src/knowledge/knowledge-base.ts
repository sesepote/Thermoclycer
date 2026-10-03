import { Primer } from './entities/primer';
import { Polymerase } from './entities/polymerase';
import { Buffer } from './entities/buffer';
import { Chemistry } from './entities/chemistry';
import { Assay } from './entities/assay';
import { Protocol } from './entities/protocol';
import { Rule } from './entities/rule';
import { Relationship, RelationType } from './relationships';
import { Source } from '../types/common';

// Colección genérica indexada por id. Añadir un tipo de entidad nuevo a
// la base de conocimiento es declarar un campo más en KnowledgeBase,
// sin repetir add/get/all por cada tipo.
export class Collection<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  add(...items: T[]): this {
    for (const item of items) this.items.set(item.id, item);
    return this;
  }

  get(id: string | undefined): T | undefined {
    return id === undefined ? undefined : this.items.get(id);
  }

  all(): T[] {
    return [...this.items.values()];
  }

  get size(): number {
    return this.items.size;
  }
}

// Repositorio en memoria de todo el "motor de conocimiento" (entidades,
// relaciones, reglas, protocolos y fuentes). Solo guarda y consulta: la
// lógica de negocio vive en los motores de reglas y de cálculo.
export class KnowledgeBase {
  readonly primers = new Collection<Primer>();
  readonly polymerases = new Collection<Polymerase>();
  readonly buffers = new Collection<Buffer>();
  readonly chemistries = new Collection<Chemistry>();
  readonly assays = new Collection<Assay>();
  readonly protocols = new Collection<Protocol>();
  readonly rules = new Collection<Rule>();
  readonly sources = new Collection<Source>();
  private readonly relationships: Relationship[] = [];

  constructor(readonly version: string) {}

  /* ---------- Relaciones del grafo ---------- */

  addRelationship(...relationships: Relationship[]): void {
    this.relationships.push(...relationships);
  }

  relationshipsFrom(id: string, type?: RelationType): Relationship[] {
    return this.relationships.filter(r => r.from === id && (!type || r.type === type));
  }

  relationshipsTo(id: string, type?: RelationType): Relationship[] {
    return this.relationships.filter(r => r.to === id && (!type || r.type === type));
  }

  /* ---------- Consultas de dominio ---------- */

  activeRules(): Rule[] {
    return this.rules.all().filter(r => r.activa);
  }

  getCompatibleBuffers(polymeraseId: string): Buffer[] {
    const ids = this.polymerases.get(polymeraseId)?.buffersCompatibles ?? [];
    return ids.map(id => this.buffers.get(id)).filter((b): b is Buffer => b !== undefined);
  }

  isPolymeraseBufferCompatible(polymeraseId: string, bufferId: string): boolean {
    return this.getCompatibleBuffers(polymeraseId).some(b => b.id === bufferId);
  }

  // Resuelve todos los ids de un ensayo a sus entidades completas.
  getAssayComponents(assayId: string) {
    const assay = this.assays.get(assayId);
    if (!assay) return undefined;
    return {
      assay,
      primerForward: this.primers.get(assay.primerForward),
      primerReverse: this.primers.get(assay.primerReverse),
      polymerase: this.polymerases.get(assay.polimerasa),
      buffer: this.buffers.get(assay.buffer),
      chemistry: this.chemistries.get(assay.quimica),
      referenceProtocol: this.protocols.get(assay.protocoloReferencia),
    };
  }
}
