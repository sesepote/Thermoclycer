// Gradient calculation and thermal mapping for 96-Well (8x12) Block

export interface ColumnTemp {
  column: number;     // 1 to 12
  temperature: number; // in °C
  deviation: number;   // delta from median/low
}

/**
 * Calculates the exact temperature for each of the 12 columns in a gradient thermal block.
 * Formula models standard gradient thermal cyclers (e.g. T5000-96 / Bio-Rad 96-well gradient)
 */
export function calculateGradientColumns(lowTemp: number, highTemp: number): ColumnTemp[] {
  const columns: ColumnTemp[] = [];
  const range = highTemp - lowTemp;
  const midTemp = (lowTemp + highTemp) / 2;

  for (let col = 1; col <= 12; col++) {
    // Fraction along the 12 columns: col 1 is 0.0, col 12 is 1.0
    // Real gradient cyclers often follow an s-curve or linear distribution
    const fraction = (col - 1) / 11;
    // We calculate to 1 decimal place precision as displayed on lab instruments
    const temp = Number((lowTemp + range * fraction).toFixed(1));
    const deviation = Number((temp - midTemp).toFixed(1));
    columns.push({
      column: col,
      temperature: temp,
      deviation,
    });
  }

  return columns;
}

/**
 * Returns an authentic scientific thermal colormap (HSL / Hex)
 * Range mapped: 4°C (icy indigo) to 95°C+ (deep crimson red)
 */
// La rampa programada es para 50 µL. Más volumen añade inercia y la
// ralentiza; menos volumen la acelera, con la raíz para que el efecto
// se note sin disparar la velocidad.
const REFERENCE_VOLUME_UL = 50;

export function effectiveRampRate(rampRate: number | undefined, sampleVolume: number): number {
  const base = rampRate && rampRate > 0 ? rampRate : 3.5;
  const volume = Math.min(100, Math.max(10, sampleVolume || REFERENCE_VOLUME_UL));
  const factor = Math.sqrt(REFERENCE_VOLUME_UL / volume);
  return Math.min(8, Math.max(0.4, Number((base * factor).toFixed(2))));
}

export function getThermalColor(temperature: number): { hex: string } {
  // Clamp between 4 and 100
  const clamped = Math.max(4, Math.min(100, temperature));
  const t = (clamped - 4) / (100 - 4); // 0 to 1

  // 0 (4°C): Dark Blue/Cyan (hue ~220)
  // 0.5 (52°C): Emerald/Teal (hue ~160)
  // 0.65 (65°C): Amber/Yellow (hue ~45)
  // 0.8 (72°C): Orange (hue ~25)
  // 1.0 (95-100°C): Red/Ruby (hue ~0)
  let hue: number;
  let sat = 90;
  let light = 48;

  if (t < 0.3) {
    // 4°C to ~32°C: Navy to Sky Cyan
    hue = 225 - t * (45 / 0.3); // 225 -> 180
  } else if (t < 0.6) {
    // 32°C to ~60°C: Cyan to Amber Green
    hue = 180 - (t - 0.3) * (135 / 0.3); // 180 -> 45
  } else if (t < 0.8) {
    // 60°C to ~80°C: Amber to Orange Red
    hue = 45 - (t - 0.6) * (30 / 0.2); // 45 -> 15
  } else {
    // 80°C to 100°C: Fiery Red
    hue = 15 - (t - 0.8) * (15 / 0.2); // 15 -> 0
  }

  return { hex: `hsl(${Math.round(hue)}, ${sat}%, ${light}%)` };
}

/**
 * Formats seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number, isInfinite = false): string {
  if (isInfinite || seconds === 0) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
