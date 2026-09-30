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
export function getThermalColor(temperature: number): { bg: string; text: string; hex: string } {
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

  // Determine good contrast text
  const textColor = light > 40 && (hue > 40 && hue < 170) ? '#0f172a' : '#ffffff';
  const hex = `hsl(${Math.round(hue)}, ${sat}%, ${light}%)`;
  
  return {
    bg: hex,
    text: textColor,
    hex,
  };
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

/**
 * Parses "mm:ss" string to seconds
 */
export function parseDurationString(str: string): number {
  if (str === '∞' || str.toLowerCase() === 'inf') return 0;
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return 30; // fallback 30s
}
