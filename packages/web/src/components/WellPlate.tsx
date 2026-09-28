const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLUMNS = Array.from({ length: 12 }, (_, i) => i + 1);

export function WellPlate({ color, active }: { color: string; active: boolean }) {
  return (
    <figure className={`plate ${active ? 'plate--active' : ''}`} style={{ '--well-color': color } as React.CSSProperties}>
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
}
