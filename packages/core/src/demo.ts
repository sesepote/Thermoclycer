import { buildDemoKnowledgeBase } from './knowledge/seed-data';
import { RuleEngine } from './rules/engine';
import { buildDefaultCalculationResolver } from './calculations/default-registry';
import { parseProtocolJson } from './protocols/parser';
import { compareProtocols } from './protocols/validator';

function main() {
  const kb = buildDemoKnowledgeBase();

  console.log(`Base de conocimiento cargada (versión ${kb.version})`);

  const components = kb.getAssayComponents('assay-demo');
  if (!components) {
    console.error('No se encontró el ensayo demo');
    return;
  }

  console.log(`Ensayo: ${components.assay.nombre}`);
  console.log(`Polimerasa: ${components.polymerase?.nombre}`);
  console.log(`Buffer compatible: ${components.buffer?.nombre}`);
  console.log(
    `¿Son compatibles?`,
    kb.isPolymeraseBufferCompatible(components.polymerase!.id, components.buffer!.id),
  );

  const protocol = components.referenceProtocol!;
  console.log(`Protocolo de referencia: ${protocol.cycles.count} ciclos, ${protocol.cycles.steps.length} pasos por ciclo`);

  console.log('\n--- Motor de reglas ---');
  const engine = new RuleEngine();
  const { facts, trace } = engine.run(kb.activeRules(), {
    polymerase: { id: components.polymerase!.id },
    primerPair: { compatible: true, forward: components.primerForward!.id, reverse: components.primerReverse!.id },
    userInput: { annealingTemperature: 60 },
    expectedRange: { min: 58, max: 62 },
  });

  console.log(`Reglas disparadas (${trace.length}):`);
  for (const entry of trace) console.log(`  - ${entry.ruleId}: ${entry.ruleNombre}`);

  console.log('\n--- Motor de cálculo (resolviendo pendingCalculation) ---');
  const resolver = buildDefaultCalculationResolver();
  const resolvedFacts = resolver.resolve(facts, kb);
  console.log('Hechos finales:', JSON.stringify(resolvedFacts, null, 2));

  console.log('\n--- Validador de protocolos ---');
  // Un protocolo "de usuario" con tres fallos deliberados: annealing
  // demasiado bajo, un ciclo de menos, y un paso extra al final.
  const protocoloDelUsuario = {
    initial: { temperature: 95, duration_seconds: 180 },
    cycles: {
      count: 34,
      steps: [
        { type: 'denaturation', temperature: 95, duration_seconds: 30 },
        { type: 'annealing', temperature: 52, duration_seconds: 30 },
        { type: 'extension', temperature: 72, duration_seconds: 45 },
        { type: 'custom', temperature: 37, duration_seconds: 10 },
      ],
    },
    final_extension: { temperature: 72, duration_seconds: 300 },
    hold: { temperature: 4 },
  };

  const parsed = parseProtocolJson(protocoloDelUsuario, 'intento-usuario');
  if (!parsed.ok) {
    console.error('El protocolo del usuario no se pudo interpretar:', parsed.errors);
    return;
  }

  const comparisons = compareProtocols(protocol, parsed.protocol);
  const discrepancias = comparisons.filter(c => c.status !== 'EXACT');
  console.log(`Discrepancias encontradas (${discrepancias.length} de ${comparisons.length} parámetros comparados):`);
  for (const d of discrepancias) console.log(`  - [${d.status}${d.errorType ? '/' + d.errorType : ''}] ${d.message}`);
}

main();
