export function formatClock(seconds: number | undefined): string {
  if (seconds === undefined) return '--:--';
  if (!Number.isFinite(seconds)) return '∞';
  const total = Math.max(0, Math.round(seconds));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} min`;
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

const COLD_HUE = 205;
const HOT_HUE = 8;
const MIN_TEMP = 4;
const MAX_TEMP = 100;

// Color funcional: la escala va del azul (frío, hold a 4°C) al rojo
// (desnaturalización a 95°C), igual que un mapa térmico.
export function temperatureColor(temperature: number | undefined, lightness = 58): string {
  if (temperature === undefined || !Number.isFinite(temperature)) return 'var(--muted)';
  const t = Math.min(1, Math.max(0, (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));
  const hue = COLD_HUE + (HOT_HUE - COLD_HUE) * t;
  return `hsl(${hue.toFixed(0)} 88% ${lightness}%)`;
}
