import React, { useState } from 'react';
import { Modal } from './Modal';
import { X, Settings, Flame, Volume2, Check } from 'lucide-react';
import { PCRProtocol } from '../types/pcr';
import { isSoundEnabled, setSoundEnabled, playKeyClick, playConfirmBeep } from '../utils/audio';

interface InstrumentSettingsModalProps {
  protocol: PCRProtocol;
  onUpdateProtocolSettings: (settings: {
    lidTemperature: number;
    lidHeatingEnabled: boolean;
    sampleVolume: number;
  }) => void;
  onClose: () => void;
}

export const InstrumentSettingsModal: React.FC<InstrumentSettingsModalProps> = ({
  protocol,
  onUpdateProtocolSettings,
  onClose,
}) => {
  const [lidEnabled, setLidEnabled] = useState<boolean>(protocol.lidHeatingEnabled);
  const [lidTemp, setLidTemp] = useState<number>(protocol.lidTemperature);
  const [volume, setVolume] = useState<number>(protocol.sampleVolume);
  const [sound, setSound] = useState<boolean>(isSoundEnabled());

  const handleApply = () => {
    playConfirmBeep();
    setSoundEnabled(sound);
    onUpdateProtocolSettings({
      lidHeatingEnabled: lidEnabled,
      lidTemperature: lidTemp,
      sampleVolume: volume,
    });
    onClose();
  };

  return (
    <Modal title="Configuración del equipo" onClose={onClose} padding="p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-700 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Ajustes del Termociclador</h3>
              <p className="text-xs text-slate-400 font-mono">T5000-96 Hardware Calibration</p>
            </div>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-4">
          {/* Heated Lid Setting */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className={`w-4 h-4 ${lidEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Tapa Calefactada (Anti-condensación)
                </span>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  setLidEnabled(!lidEnabled);
                }}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  lidEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {lidEnabled ? 'ACTIVA' : 'APAGADA'}
              </button>
            </div>

            {lidEnabled && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 font-mono">Temperatura de Tapa:</span>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => {
                      playKeyClick();
                      setLidTemp((t) => Math.max(30, t - 1));
                    }}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-white tabular-nums w-14 text-center">
                    {lidTemp.toFixed(1)}°C
                  </span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setLidTemp((t) => Math.min(115, t + 1));
                    }}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sample Volume Setting */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                Volumen de Muestra en Tubo (µL)
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">{volume} µL</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Compensa la inercia térmica de los microtubos de 0.2 mL.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[10, 20, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    playKeyClick();
                    setVolume(v);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    volume === v
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {v}µL
                </button>
              ))}
            </div>
          </div>

          {/* Audio Beeper Setting */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Beeper Acústico de Laboratorio
                </div>
                <div className="text-[11px] text-slate-400">
                  Sonidos para clicks, avisos de paso y fin de corrida
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                playKeyClick();
                setSound(!sound);
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                sound ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {sound ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Aplicar Ajustes
          </button>
        </div>
      </div>
    </Modal>
  );
};
