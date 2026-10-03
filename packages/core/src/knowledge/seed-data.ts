// Datos de ejemplo para ejercitar la base de conocimiento y los tests.
// NO son datos verificados de ningún fabricante o paper: son valores
// genéricos de manual, marcados así en "fuente"/"notas".

import { SourceType } from '../types/common';
import { KnowledgeBase } from './knowledge-base';
import { exampleRules } from '../rules/definitions/example-rules';

export function buildDemoKnowledgeBase(): KnowledgeBase {
  const kb = new KnowledgeBase('0.1.0-demo');
  const demo = { organismo: 'demo', genObjetivo: 'gen-demo', fuente: 'ejemplo interno, no verificado' };

  /* ---------- Primers (Tm y %GC los calcula el motor de cálculo) ---------- */
  kb.primers.add(
    { id: 'primer-fwd-demo', nombre: 'Demo-FWD', secuencia: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', ...demo },
    { id: 'primer-rev-demo', nombre: 'Demo-REV', secuencia: 'CTATCGGGCACCCTTTCAGCGGCCCATTACAATGGCCAT', ...demo },
  );

  /* ---------- Reactivos ---------- */
  kb.polymerases.add({
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
  });

  kb.buffers.add({
    id: 'buffer-standard-demo',
    nombre: 'Buffer estándar (demo)',
    composicion: { MgCl2: '1.5mM', KCl: '50mM', 'Tris-HCl': '10mM' },
    compatibilidades: ['poly-taq-demo'],
    fuente: 'genérico de literatura de PCR',
  });

  kb.chemistries.add({
    id: 'chem-endpoint-demo',
    nombre: 'PCR end-point (demo)',
    tipo: 'end-point',
    descripcion: 'Amplificación simple sin detección en tiempo real',
    fuente: 'genérico',
  });

  /* ---------- Protocolo de referencia (ejemplo de la sección 5 de la spec) ---------- */
  kb.protocols.add({
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
  });

  /* ---------- Ensayo que une todo lo anterior por id ---------- */
  kb.assays.add({
    id: 'assay-demo',
    nombre: 'Ensayo demo',
    tipoDePCR: 'end-point',
    primerForward: 'primer-fwd-demo',
    primerReverse: 'primer-rev-demo',
    polimerasa: 'poly-taq-demo',
    buffer: 'buffer-standard-demo',
    quimica: 'chem-endpoint-demo',
    protocoloReferencia: 'protocol-demo-3step',
  });

  kb.addRelationship(
    { from: 'primer-fwd-demo', to: 'gen-demo', type: 'amplifica' },
    { from: 'poly-taq-demo', to: 'buffer-standard-demo', type: 'compatible_con' },
  );
  kb.rules.add(...exampleRules);

  return kb;
}
