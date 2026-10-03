import React, { useState } from 'react';
import { Modal } from './Modal';
import { X, FolderOpen, Save, Trash2, Check, Download } from 'lucide-react';
import { PCRProtocol } from '../types/pcr';
import { PCR_PRESETS } from '../utils/presets';
import { playKeyClick, playConfirmBeep } from '../utils/audio';

interface ProtocolLibraryModalProps {
  currentProtocol: PCRProtocol;
  userProtocols: PCRProtocol[];
  onLoadProtocol: (protocol: PCRProtocol) => void;
  onSaveCurrentProtocol: (name: string, description: string) => void;
  onDeleteProtocol: (protocolId: string) => void;
  onClose: () => void;
}

export const ProtocolLibraryModal: React.FC<ProtocolLibraryModalProps> = ({
  currentProtocol,
  userProtocols,
  onLoadProtocol,
  onSaveCurrentProtocol,
  onDeleteProtocol,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'user' | 'save'>('presets');
  const [saveName, setSaveName] = useState<string>(currentProtocol.name + '_COPIA');
  const [saveDesc, setSaveDesc] = useState<string>(currentProtocol.description || 'Protocolo personalizado');

  const handleSave = () => {
    if (!saveName.trim()) return;
    playConfirmBeep();
    onSaveCurrentProtocol(saveName.trim(), saveDesc.trim());
    setActiveTab('user');
  };

  const handleExportJSON = (p: PCRProtocol) => {
    playKeyClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${p.name.replace(/\s+/g, '_')}_protocol.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Modal title="Biblioteca de protocolos" onClose={onClose} padding="p-3">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Biblioteca de Protocolos PCR</h3>
              <p className="text-xs text-slate-400 font-mono">Memoria Interna del Termociclador T5000-96</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2 gap-2">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('presets');
            }}
            className={`px-4 py-2 font-mono text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
              activeTab === 'presets'
                ? 'bg-slate-900 border-slate-700 text-cyan-400'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Protocolos de Fábrica ({PCR_PRESETS.length})
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('user');
            }}
            className={`px-4 py-2 font-mono text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
              activeTab === 'user'
                ? 'bg-slate-900 border-slate-700 text-cyan-400'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guardados por Usuario ({userProtocols.length})
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('save');
            }}
            className={`px-4 py-2 font-mono text-xs font-semibold rounded-t-lg transition-colors border-t border-x flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'bg-slate-900 border-slate-700 text-amber-400'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Actual
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              {PCR_PRESETS.map((p) => {
                const isCurrent = p.name === currentProtocol.name;
                const hasGrad = p.steps.some((s) => s.gradient?.enabled);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{p.name}</span>
                        {hasGrad && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            GRADIENTE
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            ACTIVO EN PANTALLA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mt-2">
                        <span>{p.steps.length} Pasos</span>
                        <span>·</span>
                        <span>{p.loops[0]?.repeatCount || 0} Ciclos</span>
                        <span>·</span>
                        <span>Tapa: {p.lidTemperature}°C</span>
                        <span>·</span>
                        <span>Volumen: {p.sampleVolume}µL</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportJSON(p)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Exportar archivo JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          playConfirmBeep();
                          onLoadProtocol(p);
                          onClose();
                        }}
                        className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isCurrent ? 'Cargado' : 'Cargar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'user' && (
            <div className="space-y-2.5">
              {userProtocols.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm">No hay protocolos de usuario guardados aún.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cree o modifique un protocolo y use la pestaña &quot;Guardar Actual&quot; para almacenarlo.
                  </p>
                </div>
              ) : (
                userProtocols.map((p) => {
                  const isCurrent = p.name === currentProtocol.name;
                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {p.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mt-2">
                          <span>{p.steps.length} Pasos</span>
                          <span>·</span>
                          <span>{p.loops[0]?.repeatCount || 0} Ciclos</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExportJSON(p)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Descargar JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            playKeyClick();
                            onDeleteProtocol(p.id);
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 border border-slate-700 transition-colors"
                          title="Eliminar protocolo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            playConfirmBeep();
                            onLoadProtocol(p);
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-lg font-mono text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition-colors cursor-pointer"
                        >
                          Cargar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'save' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                  Nombre del Protocolo:
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-cyan-400"
                  placeholder="Ej: GRADIENT_OPTIMIZATION_01"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 uppercase">
                  Descripción / Notas de Laboratorio:
                </label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-hidden focus:border-cyan-400"
                  placeholder="Ej: Primers GAPDH a 55°C gradiente..."
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div>Pasos actuales: {currentProtocol.steps.length}</div>
                <div>Ciclos configurados: {currentProtocol.loops[0]?.repeatCount || 0}</div>
                <div>Gradiente activo: {currentProtocol.steps.some(s => s.gradient?.enabled) ? 'Sí' : 'No'}</div>
              </div>

              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar en Memoria del Equipo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end">
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
