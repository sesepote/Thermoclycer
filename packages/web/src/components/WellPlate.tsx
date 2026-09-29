import { memo } from 'react';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLUMNS = Array.from({ length: 12 }, (_, i) => i + 1);

// Placa de 96 pocillos. El color sale de la variable CSS --block-color
// que fija el panel, así que la temperatura cambiante no re-renderiza
// estos 96 nodos: solo cambia cuando se enciende o apaga la animación.
export const WellPlate = memo(function WellPlate({ active }: { active: boolean }) {
  return (
    <figure className={`plate ${active ? 'plate--active' : ''}`}>
      <div className="plate__grid" aria-hidden="true">
        <span />
        {COLUMNS.map(c => (
          <span key={c} className="plate__axis">
            {c}
          </span>
        ))}
        {ROWS.map((row, r) => (
          <div key={row} className="plate__row">
            <span className="plate__axis">{row}</span>
            {COLUMNS.map(c => (
              <span key={c} className="plate__well" style={{ animationDelay: `${(r + c) * 40}ms` }} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="plate__caption">Bloque de 96 pocillos</figcaption>
    </figure>
  );
});
