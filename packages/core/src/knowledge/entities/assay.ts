export interface Assay {
  id: string;
  nombre: string;
  tipoDePCR: string; // ej. "end-point", "qPCR", "RT-PCR"
  primerForward: string; // id de Primer
  primerReverse: string; // id de Primer
  polimerasa: string; // id de Polymerase
  buffer: string; // id de Buffer
  quimica: string; // id de Chemistry
  plantilla?: string;
  objetivo?: string;
  protocoloReferencia?: string; // id de Protocol
}
