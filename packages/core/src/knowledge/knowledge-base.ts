import { Primer } from './entities/primer';
import { Polymerase } from './entities/polymerase';
import { Buffer } from './entities/buffer';
import { Chemistry } from './entities/chemistry';
import { Assay } from './entities/assay';
import { Protocol } from './entities/protocol';
import { Rule } from './entities/rule';
import { Relationship, RelationType } from './relationships';
import { Source } from '../types/common';

// Todo lo que en la spec se llama "motor de conocimiento" (entidades +
// propiedades + relaciones + reglas + protocolos + fuentes) vive aquí,
// en un único repositorio en memoria. No hay lógica de negocio: eso es
// del motor de reglas y del motor de cálculo (fases siguientes). Esto
// solo guarda y consulta.

export class KnowledgeBase {
  readonly version: string;

  private primers = new Map<string, Primer>();
  private polymerases = new Map<string, Polymerase>();
  private buffers = new Map<string, Buffer>();
  private chemistries = new Map<string, Chemistry>();
  private assays = new Map<string, Assay>();
  private protocols = new Map<string, Protocol>();
  private rules = new Map<string, Rule>();
  private sources = new Map<string, Source>();
  private relationships: Relationship[] = [];

  constructor(version: string) {
    this.version = version;
  }

  addPrimer(p: Primer) { this.primers.set(p.id, p); }
  getPrimer(id: string) { return this.primers.get(id); }
  allPrimers() { return [...this.primers.values()]; }

  addPolymerase(p: Polymerase) { this.polymerases.set(p.id, p); }
  getPolymerase(id: string) { return this.polymerases.get(id); }
  allPolymerases() { return [...this.polymerases.values()]; }

  addBuffer(b: Buffer) { this.buffers.set(b.id, b); }
  getBuffer(id: string) { return this.buffers.get(id); }
  allBuffers() { return [...this.buffers.values()]; }

  addChemistry(c: Chemistry) { this.chemistries.set(c.id, c); }
  getChemistry(id: string) { return this.chemistries.get(id); }
  allChemistries() { return [...this.chemistries.values()]; }

  addAssay(a: Assay) { this.assays.set(a.id, a); }
  getAssay(id: string) { return this.assays.get(id); }
  allAssays() { return [...this.assays.values()]; }

  addProtocol(p: Protocol) { this.protocols.set(p.id, p); }
  getProtocol(id: string) { return this.protocols.get(id); }
  allProtocols() { return [...this.protocols.values()]; }

  addRule(r: Rule) { this.rules.set(r.id, r); }
  getRule(id: string) { return this.rules.get(id); }
  activeRules() { return [...this.rules.values()].filter(r => r.activa); }

  addSource(s: Source) { this.sources.set(s.id, s); }
  getSource(id: string) { return this.sources.get(id); }

  addRelationship(r: Relationship) { this.relationships.push(r); }

  relationshipsFrom(id: string, type?: RelationType): Relationship[] {
    return this.relationships.filter(r => r.from === id && (!type || r.type === type));
  }

  relationshipsTo(id: string, type?: RelationType): Relationship[] {
    return this.relationships.filter(r => r.to === id && (!type || r.type === type));
  }

  // Consultas de dominio, construidas encima de lo anterior. Estas son
  // las que de verdad usará el resto del sistema (generador de
  // ejercicios, evaluador, etc.), no las relaciones en crudo.

  getCompatibleBuffers(polymeraseId: string): Buffer[] {
    const poly = this.getPolymerase(polymeraseId);
    if (!poly?.buffersCompatibles) return [];
    return poly.buffersCompatibles
      .map(id => this.getBuffer(id))
      .filter((b): b is Buffer => b !== undefined);
  }

  isPolymeraseBufferCompatible(polymeraseId: string, bufferId: string): boolean {
    return this.getCompatibleBuffers(polymeraseId).some(b => b.id === bufferId);
  }

  getAssayComponents(assayId: string) {
    const assay = this.getAssay(assayId);
    if (!assay) return undefined;
    return {
      assay,
      primerForward: this.getPrimer(assay.primerForward),
      primerReverse: this.getPrimer(assay.primerReverse),
      polymerase: this.getPolymerase(assay.polimerasa),
      buffer: this.getBuffer(assay.buffer),
      chemistry: this.getChemistry(assay.quimica),
      referenceProtocol: assay.protocoloReferencia
        ? this.getProtocol(assay.protocoloReferencia)
        : undefined,
    };
  }
}
