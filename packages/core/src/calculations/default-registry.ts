import { KnowledgeBase } from '../knowledge/knowledge-base';
import { CalculationResolver } from './resolver';
import { calculateAnnealingTemperatureRange } from './thermodynamics';
import { notCalculable } from './types';

export function buildDefaultCalculationResolver(): CalculationResolver {
  const resolver = new CalculationResolver();

  resolver.register('calculateAnnealingConstraints', (args, kb: KnowledgeBase) => {
    const forwardId = args.primerForward;
    const reverseId = args.primerReverse;
    if (typeof forwardId !== 'string' || typeof reverseId !== 'string') {
      return notCalculable('faltan los ids de los primers para calcular las restricciones de annealing');
    }

    const primerForward = kb.getPrimer(forwardId);
    const primerReverse = kb.getPrimer(reverseId);
    if (!primerForward || !primerReverse) {
      return notCalculable('no se encontró en la base de conocimiento alguno de los dos primers');
    }

    return calculateAnnealingTemperatureRange(primerForward, primerReverse);
  });

  return resolver;
}
