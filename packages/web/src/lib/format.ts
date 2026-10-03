import { CSSProperties } from 'react';

/* ---------- Tiempo ---------- */

const pad2 = (n: number) => n.toString().padStart(2, '0');

// Reloj tipo display: "mm:ss" o "h:mm:ss".
export function formatClock(seconds: number | undefined): string {
  if (seconds === undefined) return '--:--';
  if (!Number.isFinite(seconds)) return '∞';
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const mmss = `${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

// Duración legible: "1 h 09 min", "3 min 5 s", "45 s".
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${pad2(m)} min`;
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

/* ---------- Color térmico ---------- */

const COLD_HUE = 205;
const HOT_HUE = 8;
const MIN_TEMP = 4;
const MAX_TEMP = 100;

// Escala funcional de azul (hold a 4 °C) a rojo (desnaturalización a 95 °C).
export function temperatureColor(temperature: number | undefined, lightness = 58): string {
  if (temperature === undefined || !Number.isFinite(temperature)) return 'var(--muted)';
  const t = Math.min(1, Math.max(0, (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));
  return `hsl(${(COLD_HUE + (HOT_HUE - COLD_HUE) * t).toFixed(0)} 88% ${lightness}%)`;
}

// Variables CSS personalizadas tipadas para el atributo style.
export const cssVars = (vars: Record<`--${string}`, string>): CSSProperties => vars as CSSProperties;
