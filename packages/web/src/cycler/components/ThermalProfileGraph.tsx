import React from 'react';
import { PCRProtocol, RunProgressState } from '../types/pcr';
import { formatDuration } from '../utils/gradient';
import { Sparkles, Repeat, Flame } from 'lucide-react';

interface ThermalProfileGraphProps {
  protocol: PCRProtocol;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  onEditTemperature: (stepIndex: number) => void;
  onEditTime: (stepIndex: number) => void;
  onEditLoop: (loopIndex: number) => void;
  onOpenGradient: (stepIndex: number) => void;
  runProgress?: RunProgressState;
  isInteractive?: boolean;
}

// Etiquetas de temperatura/tiempo: son la única forma de editar un paso,
// así que tienen área de toque ampliada y se activan también con teclado.
function touchLabel(label: string, activate: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className: 'group cursor-pointer',
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      activate();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      activate();
    },
  } as const;
}

export const ThermalProfileGraph: React.FC<ThermalProfileGraphProps> = ({
  protocol,
  selectedStepIndex,
  onSelectStep,
  onEditTemperature,
  onEditTime,
  onEditLoop,
  onOpenGradient,
  runProgress,
  isInteractive = true,
}) => {
  const steps = protocol.steps;
  const numSteps = steps.length;
  if (numSteps === 0) return null;

  // Coordinate mapping
  // SVG ViewBox
  const svgWidth = 980;
  const svgHeight = 360;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 35;
  const paddingBottom = 65;

  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // Temperature range on Y axis: 0°C to 105°C
  const minTemp = 0;
  const maxTemp = 105;

  const tempToY = (temp: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
    return paddingTop + graphHeight - ((clamped - minTemp) / (maxTemp - minTemp)) * graphHeight;
  };

  // Step widths on X axis
  // Distribute step plateaus evenly with ramp connectors
  const stepColWidth = graphWidth / numSteps;
  const plateauWidth = Math.max(50, stepColWidth * 0.62);

  // Compute step geometric points
  const stepGeometry = steps.map((step, idx) => {
    const startX = paddingLeft + idx * stepColWidth;
    const plateauStartX = startX + (stepColWidth - plateauWidth) / 2;
    const plateauEndX = plateauStartX + plateauWidth;
    const y = tempToY(step.temperature);

    // Gradient secondary Y if enabled
    let gradientLowY = y;
    let gradientHighY = y;
    if (step.gradient?.enabled) {
      gradientLowY = tempToY(step.gradient.lowTemp);
      gradientHighY = tempToY(step.gradient.highTemp);
    }

    return {
      step,
      idx,
      startX,
      plateauStartX,
      plateauEndX,
      y,
      gradientLowY,
      gradientHighY,
      midX: (plateauStartX + plateauEndX) / 2,
    };
  });

  // Find loop bounding boxes
  const loopsWithBounds = protocol.loops.map((loop, loopIdx) => {
    const startGeom = stepGeometry[loop.startStepIndex];
    const endGeom = stepGeometry[loop.endStepIndex];
    if (!startGeom || !endGeom) return null;

    const left = startGeom.plateauStartX - 10;
    const right = endGeom.plateauEndX + 10;
    const width = right - left;
    return {
      loop,
      loopIdx,
      left,
      right,
      width,
    };
  }).filter(Boolean);

  // Build the continuous temperature curve path
  let pathD = '';
  stepGeometry.forEach((geom, idx) => {
    if (idx === 0) {
      // Start slightly before plateau
      pathD += `M ${geom.plateauStartX - 12} ${geom.y} L ${geom.plateauEndX} ${geom.y}`;
    } else {
      // Ramp from prev plateau end to current plateau start
      pathD += ` L ${geom.plateauStartX} ${geom.y} L ${geom.plateauEndX} ${geom.y}`;
    }
  });

  const isRunning = runProgress && runProgress.state !== 'idle' && runProgress.state !== 'completed';
  const activeStepIdx = runProgress?.currentStepIndex ?? selectedStepIndex;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Visual Header / Grid Meta */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-cyan-400 tracking-wider uppercase text-[11px] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Perfil Térmico
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Total Pasos: <strong className="text-slate-200 font-mono">{steps.length}</strong></span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Volumen: <strong className="text-slate-200 font-mono">{protocol.sampleVolume} µL</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {protocol.loops.map((loop, idx) => (
            <button
              key={idx}
              onClick={() => isInteractive && onEditLoop(idx)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] hover:bg-amber-500/20 transition-colors"
            >
              <Repeat className="w-3 h-3 text-amber-400" />
              <span>Ciclo #{idx + 1}: {loop.repeatCount}x</span>
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative flex-1 w-full min-h-[300px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient fill for steps */}
            <linearGradient id="gradientBand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="curveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Temperature Horizontal Grid Lines */}
          {[105, 95, 72, 55, 37, 4].map((t) => {
            const y = tempToY(t);
            return (
              <g key={t} className="opacity-70">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={t === 4 || t === 95 || t === 72 ? 'none' : '3 3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {t}°C
                </text>
              </g>
            );
          })}

          {/* Cycle Loop Brackets & Regions */}
          {loopsWithBounds.map((item) => {
            if (!item) return null;
            const bracketY = paddingTop - 12;
            return (
              <g
                key={item.loop.id}
                className="cursor-pointer group"
                onClick={() => isInteractive && onEditLoop(item.loopIdx)}
              >
                {/* Loop Background Highlight */}
                <rect
                  x={item.left}
                  y={paddingTop - 5}
                  width={item.width}
                  height={graphHeight + 15}
                  rx="6"
                  fill="#f59e0b"
                  fillOpacity="0.04"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="group-hover:fill-opacity-10 transition-all"
                />

                {/* Overhead Loop Bracket Line */}
                <path
                  d={`M ${item.left} ${bracketY + 8} L ${item.left} ${bracketY} L ${item.right} ${bracketY} L ${item.right} ${bracketY + 8}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />

                {/* Central Cycle Count Badge */}
                <g transform={`translate(${(item.left + item.right) / 2}, ${bracketY - 2})`}>
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
                    height="18"
                    rx="4"
                    fill="#1e1b4b"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    className="fill-amber-300 font-mono font-bold text-[10px]"
                  >
                    CICLO x{item.loop.repeatCount}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Gradient Band Fill (if step has gradient enabled) */}
          {stepGeometry.map((geom) => {
            if (!geom.step.gradient?.enabled) return null;
            const topY = Math.min(geom.gradientLowY, geom.gradientHighY);
            const bottomY = Math.max(geom.gradientLowY, geom.gradientHighY);
            const bandHeight = bottomY - topY;
            return (
              <g key={`grad-band-${geom.step.id}`}>
                <rect
                  x={geom.plateauStartX}
                  y={topY}
                  width={plateauWidth}
                  height={Math.max(4, bandHeight)}
                  rx="4"
                  fill="url(#gradientBand)"
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="cursor-pointer"
                  onClick={() => isInteractive && onOpenGradient(geom.idx)}
                />
                {/* Secondary high temp line */}
                <line
                  x1={geom.plateauStartX}
                  y1={topY}
                  x2={geom.plateauEndX}
                  y2={topY}
                  stroke="#f87171"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* Main Temperature Profile Continuous Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#curveGlow)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* Step Plateaus, Selection and Values */}
          {stepGeometry.map((geom) => {
            const isSelected = geom.idx === selectedStepIndex;
            const isGrad = geom.step.gradient?.enabled;

            return (
              <g
                key={geom.step.id}
                className="cursor-pointer"
                onClick={() => isInteractive && onSelectStep(geom.idx)}
              >
                {/* Vertical column touch boundary / background hover zone */}
                <rect
                  x={geom.startX}
                  y={paddingTop}
                  width={stepColWidth}
                  height={graphHeight}
                  fill="transparent"
                  className="hover:fill-cyan-500/5 transition-colors"
                />

                {/* Active / Selection Halo */}
                {isSelected && (
                  <g>
                    <rect
                      x={geom.plateauStartX - 6}
                      y={geom.y - 12}
                      width={plateauWidth + 12}
                      height={24}
                      rx="6"
                      fill="#0284c7"
                      fillOpacity="0.25"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="animate-pulse"
                    />
                  </g>
                )}

                {/* Plateau Highlight bar */}
                <line
                  x1={geom.plateauStartX}
                  y1={geom.y}
                  x2={geom.plateauEndX}
                  y2={geom.y}
                  stroke={isSelected ? '#38bdf8' : isGrad ? '#fb923c' : '#ffffff'}
                  strokeWidth={isSelected ? '4' : '3'}
                />

                {/* Step Identification Number Tag */}
                <circle
                  cx={geom.midX}
                  cy={geom.y}
                  r="6"
                  fill={isSelected ? '#0284c7' : '#0f172a'}
                  stroke={isSelected ? '#38bdf8' : '#64748b'}
                  strokeWidth="2"
                />
                <text
                  x={geom.midX}
                  y={geom.y + 3}
                  textAnchor="middle"
                  className="fill-white font-mono font-bold text-[8px]"
                >
                  {geom.idx + 1}
                </text>

                {/* Temperature Value Touch Label (Above plateau) */}
                <g
                  transform={`translate(${geom.midX}, ${geom.y - 18})`}
                  {...touchLabel(`Editar temperatura del paso ${geom.idx + 1}`, () => isInteractive && onEditTemperature(geom.idx))}
                >
                  <rect x="-38" y="-18" width="76" height="30" fill="transparent" />
                  <rect
                    x="-32"
                    y="-12"
                    width="64"
                    height="18"
                    rx="4"
                    fill={isSelected ? '#0369a1' : '#1e293b'}
                    stroke={isSelected ? '#38bdf8' : '#475569'}
                    strokeWidth="1"
                    className="group-hover:fill-cyan-800 transition-colors"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    className="fill-white font-mono font-bold text-[11px]"
                  >
                    {geom.step.temperature.toFixed(1)}°C
                  </text>
                  {isGrad && (
                    <text
                      x="0"
                      y="-14"
                      textAnchor="middle"
                      className="fill-orange-400 font-mono font-semibold text-[9px]"
                    >
                      {geom.step.gradient?.lowTemp.toFixed(0)}~{geom.step.gradient?.highTemp.toFixed(0)}°C
                    </text>
                  )}
                </g>

                {/* Duration Value Touch Label (Below plateau) */}
                <g
                  transform={`translate(${geom.midX}, ${geom.y + 22})`}
                  {...touchLabel(`Editar tiempo del paso ${geom.idx + 1}`, () => isInteractive && onEditTime(geom.idx))}
                >
                  <rect x="-32" y="-14" width="64" height="28" fill="transparent" />
                  <rect
                    x="-26"
                    y="-10"
                    width="52"
                    height="17"
                    rx="4"
                    fill="#0f172a"
                    stroke={isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth="1"
                    className="group-hover:fill-slate-800 transition-colors"
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    className="fill-cyan-300 font-mono text-[10px]"
                  >
                    {formatDuration(geom.step.durationSeconds, geom.step.isInfiniteHold)}
                  </text>
                </g>

                {/* Bottom Step Name Label */}
                <text
                  x={geom.midX}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`font-mono text-[10px] tracking-tight ${
                    isSelected ? 'fill-cyan-400 font-semibold' : 'fill-slate-400'
                  }`}
                >
                  {geom.step.name.length > 12 ? geom.step.name.slice(0, 11) + '…' : geom.step.name}
                </text>

                {/* Gradient Badge if enabled */}
                {isGrad && (
                  <g
                    transform={`translate(${geom.midX - 16}, ${svgHeight - 34})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isInteractive) onOpenGradient(geom.idx);
                    }}
                  >
                    <rect x="0" y="0" width="32" height="12" rx="3" fill="#ea580c" />
                    <text x="16" y="9" textAnchor="middle" className="fill-white font-mono font-bold text-[8px]">
                      GRAD
                    </text>
                  </g>
                )}

                {/* Touchdown Temp Increment delta (if present) */}
                {geom.step.tempIncrement && (
                  <g transform={`translate(${geom.midX}, ${svgHeight - 48})`}>
                    <text x="0" y="0" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px]">
                      Δ {geom.step.tempIncrement > 0 ? `+${geom.step.tempIncrement}` : geom.step.tempIncrement}°C
                    </text>
                  </g>
                )}

                {/* Ramp Rate label connecting steps */}
                {geom.step.rampRate && (
                  <text
                    x={geom.plateauStartX - 8}
                    y={geom.y + 12}
                    textAnchor="end"
                    className="fill-slate-600 font-mono text-[8px]"
                  >
                    {geom.step.rampRate}°C/s
                  </text>
                )}
              </g>
            );
          })}

          {/* Running Progress Marker (Live Execution Cursor) */}
          {isRunning && (
            <g>
              {(() => {
                const geom = stepGeometry[activeStepIdx];
                if (!geom) return null;
                // Fraction of step elapsed
                const dur = geom.step.isInfiniteHold ? 100 : Math.max(1, geom.step.durationSeconds);
                const frac = Math.min(1, Math.max(0, (runProgress?.stepElapsedSeconds || 0) / dur));
                const currentCursorX = geom.plateauStartX + frac * plateauWidth;
                const liveY = tempToY(runProgress?.currentBlockTemp ?? geom.step.temperature);

                return (
                  <g>
                    {/* Live Temp Glowing Indicator */}
                    <line
                      x1={currentCursorX}
                      y1={paddingTop}
                      x2={currentCursorX}
                      y2={svgHeight - paddingBottom}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    {/* Live Temp Indicator Dot (Clean solid scientific marker, no ping/signal) */}
                    <circle
                      cx={currentCursorX}
                      cy={liveY}
                      r="5.5"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' }}
                    />
                    {/* Real-time Block readout badge */}
                    <g transform={`translate(${currentCursorX}, ${liveY - 14})`}>
                      <rect x="-24" y="-12" width="48" height="15" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                      <text x="0" y="-1" textAnchor="middle" className="fill-red-400 font-mono font-bold text-[9px]">
                        {runProgress?.currentBlockTemp.toFixed(1)}°C
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Quick Step Inspector Bar (Bottom) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Paso Seleccionado:</span>
          <span className="font-bold text-cyan-400 font-mono">
            #{selectedStepIndex + 1} ({steps[selectedStepIndex]?.name})
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300 font-mono">
            {steps[selectedStepIndex]?.temperature.toFixed(1)}°C
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300 font-mono">
            {formatDuration(steps[selectedStepIndex]?.durationSeconds, steps[selectedStepIndex]?.isInfiniteHold)}
          </span>
          {steps[selectedStepIndex]?.gradient?.enabled && (
            <span className="inline-flex items-center gap-1 text-orange-400 font-mono font-medium">
              <Flame className="w-3 h-3" /> Gradiente: {steps[selectedStepIndex]?.gradient?.lowTemp}°C ~ {steps[selectedStepIndex]?.gradient?.highTemp}°C
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => isInteractive && onOpenGradient(selectedStepIndex)}
            className={`px-2.5 py-1 rounded border font-mono text-[11px] transition-colors flex items-center gap-1 ${
              steps[selectedStepIndex]?.gradient?.enabled
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3 text-orange-400" />
            {steps[selectedStepIndex]?.gradient?.enabled ? 'Gradiente (Activo)' : 'Gradiente'}
          </button>
        </div>
      </div>
    </div>
  );
};
