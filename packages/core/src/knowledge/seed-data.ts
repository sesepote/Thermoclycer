// Datos de ejemplo, solo para poder ejercitar la base de conocimiento
// y los tests. NO son datos verificados de ningún fabricante o paper
// real: son valores genéricos de manual, marcados como tal en "notas"
// y con origin/fuente que lo deja claro. Cuando llegue la Fase 4
// (motor de cálculo) y se cargue conocimiento real, esto se sustituye.

import { SourceType } from '../types/common';
import { KnowledgeBase } from './knowledge-base';
import { Primer } from './entities/primer';
import { Polymerase } from './entities/polymerase';
import { Buffer } from './entities/buffer';
import { Chemistry } from './entities/chemistry';
import { Assay } from './entities/assay';
import { Protocol } from './entities/protocol';
import { exampleRules } from '../rules/definitions/example-rules';

export function buildDemoKnowledgeBase(): KnowledgeBase {
  const kb = new KnowledgeBase('0.1.0-demo');

  const primerFwd: Primer = {
    id: 'primer-fwd-demo',
    nombre: 'Demo-FWD',
    secuencia: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    organismo: 'demo',
    genObjetivo: 'gen-demo',
    fuente: 'ejemplo interno, no verificado',
    notas: 'Tm y %GC pendientes: los calcula el motor de cálculo (Fase 4), aquí no se inventan.',
  };

  const primerRev: Primer = {
    id: 'primer-rev-demo',
    nombre: 'Demo-REV',
    secuencia: 'CTATCGGGCACCCTTTCAGCGGCCCATTACAATGGCCAT',
    organismo: 'demo',
    genObjetivo: 'gen-demo',
    fuente: 'ejemplo interno, no verificado',
  };

  const polymerase: Polymerase = {
    id: 'poly-taq-demo',
    nombre: 'Taq genérica (demo)',
    tipo: 'hot-start',
    fabricante: 'genérico',
    temperaturaRecomendada: {
      value: 72,
      unit: 'C',
      origin: SourceType.REFERENCE,
      confidence: 'low',
      warnings: ['valor típico de manual, no de una ficha técnica concreta'],
    },
    rangoTemperatura: { min: 68, max: 75, unit: 'C' },
    requisitos: ['activación por calor 95°C'],
    buffersCompatibles: ['buffer-standard-demo'],
    fuente: 'genérico de literatura de PCR',
  };

  const buffer: Buffer = {
    id: 'buffer-standard-demo',
    nombre: 'Buffer estándar (demo)',
    composicion: { MgCl2: '1.5mM', KCl: '50mM', 'Tris-HCl': '10mM' },
    compatibilidades: ['poly-taq-demo'],
    fuente: 'genérico de literatura de PCR',
  };

  const chemistry: Chemistry = {
    id: 'chem-endpoint-demo',
    nombre: 'PCR end-point (demo)',
    tipo: 'end-point',
    descripcion: 'Amplificación simple sin detección en tiempo real',
    fuente: 'genérico',
  };

  const protocol: Protocol = {
    id: 'protocol-demo-3step',
    nombre: 'Protocolo demo de 3 pasos',
    initial: { temperature: 95, durationSeconds: 180 },
    cycles: {
      count: 35,
      steps: [
        { type: 'denaturation', temperature: 95, durationSeconds: 30 },
        { type: 'annealing', temperature: 60, durationSeconds: 30 },
        { type: 'extension', temperature: 72, durationSeconds: 45 },
      ],
    },
    finalExtension: { temperature: 72, durationSeconds: 300 },
    hold: { temperature: 4 },
    fuente: 'ejemplo de la spec, sección 5',
  };

  const assay: Assay = {
    id: 'assay-demo',
    nombre: 'Ensayo demo',
    tipoDePCR: 'end-point',
    primerForward: primerFwd.id,
    primerReverse: primerRev.id,
    polimerasa: polymerase.id,
    buffer: buffer.id,
    quimica: chemistry.id,
    protocoloReferencia: protocol.id,
  };

  kb.addPrimer(primerFwd);
  kb.addPrimer(primerRev);
  kb.addPolymerase(polymerase);
  kb.addBuffer(buffer);
  kb.addChemistry(chemistry);
  kb.addProtocol(protocol);
  kb.addAssay(assay);

  kb.addRelationship({ from: primerFwd.id, to: assay.objetivo ?? 'gen-demo', type: 'amplifica' });
  kb.addRelationship({ from: polymerase.id, to: buffer.id, type: 'compatible_con' });

  for (const rule of exampleRules) kb.addRule(rule);

  return kb;
}
