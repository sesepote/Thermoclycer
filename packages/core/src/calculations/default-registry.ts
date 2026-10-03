import { CalculationResolver } from './resolver';
import { calculateAnnealingTemperatureRange } from './thermodynamics';
import { notCalculable } from './types';

// Registro de las funciones de cálculo que pueden invocar las reglas
// (acción "invoke"). Para añadir una nueva basta otro register().
export function buildDefaultCalculationResolver(): CalculationResolver {
  return new CalculationResolver().register('calculateAnnealingConstraints', (args, kb) => {
    const { primerForward, primerReverse } = args;
    if (typeof primerForward !== 'string' || typeof primerReverse !== 'string') {
      return notCalculable('faltan los ids de los primers para calcular las restricciones de annealing');
    }
    const fwd = kb.primers.get(primerForward);
    const rev = kb.primers.get(primerReverse);
    if (!fwd || !rev) return notCalculable('no se encontró en la base de conocimiento alguno de los dos primers');
    return calculateAnnealingTemperatureRange(fwd, rev);
  });
}
