import { useState, useEffect } from 'react';
import { PCRProtocol, PCRStep, PCRCycleLoop, ModalType, GradientConfig } from './types/pcr';
import { DEFAULT_T5000_PROTOCOL } from './utils/presets';
import { usePCRRunner } from './hooks/usePCRRunner';
import { TopStatusBar } from './components/TopStatusBar';
import { ThermalProfileGraph } from './components/ThermalProfileGraph';
import { BottomToolbar } from './components/BottomToolbar';
import { TouchNumpadModal } from './components/TouchNumpadModal';
import { GradientModal } from './components/GradientModal';
import { CycleLoopModal } from './components/CycleLoopModal';
import { ProtocolLibraryModal } from './components/ProtocolLibraryModal';
import { InstrumentSettingsModal } from './components/InstrumentSettingsModal';
import { Plate96View } from './components/Plate96View';
import { RunMonitorScreen } from './components/RunMonitorScreen';
import { playConfirmBeep, playKeyClick } from './utils/audio';
import { instrument, useInstrument } from '../state/instrument';

const STORAGE_KEY_CURRENT = 't5000_current_protocol';
const STORAGE_KEY_USER_PROTOCOLS = 't5000_user_protocols';

// Pantalla del termociclador (proyecto Termociclador-solo) sin su
// carcasa. Publica su estado en state/instrument para la barra de estado
// y el inicio, y acepta programas enviados desde el editor de protocolo.
// La temperatura y el tiempo de un paso se editan tocando sus etiquetas
// en el gráfico.
export default function CyclerApp() {
  // Protocol State
  const [protocol, setProtocol] = useState<PCRProtocol>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_T5000_PROTOCOL;
  });

  // User Saved Protocols
  const [userProtocols, setUserProtocols] = useState<PCRProtocol[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_PROTOCOLS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // UI Selection & Modal State
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(1);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  // Execution Engine
  const {
    progressState,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    advanceStep,
    skipPreheatingLid,
    setSimSpeed,
  } = usePCRRunner({
    protocol,
  });

  // Save current protocol to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(protocol));
    } catch {
      // ignore
    }
  }, [protocol]);

  // Save user protocols
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_PROTOCOLS, JSON.stringify(userProtocols));
    } catch {
      // ignore
    }
  }, [userProtocols]);

  // Step Operations
  const handleSelectStep = (index: number) => {
    playKeyClick();
    setSelectedStepIndex(Math.max(0, Math.min(protocol.steps.length - 1, index)));
  };

  const handleAddStep = () => {
    playConfirmBeep();
    const newStep: PCRStep = {
      id: 'step_' + Date.now(),
      name: 'Paso Extra',
      temperature: 72.0,
      durationSeconds: 30,
      rampRate: 3.5,
    };

    const insertIdx = selectedStepIndex + 1;
    const newSteps = [...protocol.steps];
    newSteps.splice(insertIdx, 0, newStep);

    // Adjust loop boundaries if inserted inside or before loop
    const newLoops = protocol.loops.map((l) => {
      let { startStepIndex, endStepIndex } = l;
      if (insertIdx <= startStepIndex) {
        startStepIndex += 1;
        endStepIndex += 1;
      } else if (insertIdx <= endStepIndex) {
        endStepIndex += 1;
      }
      return { ...l, startStepIndex, endStepIndex };
    });

    setProtocol({
      ...protocol,
      steps: newSteps,
      loops: newLoops,
    });
    setSelectedStepIndex(insertIdx);
  };

  const handleDeleteStep = () => {
    if (protocol.steps.length <= 2) return;
    playKeyClick();

    const deleteIdx = selectedStepIndex;
    const newSteps = protocol.steps.filter((_, idx) => idx !== deleteIdx);

    // Adjust loop boundaries
    const newLoops = protocol.loops
      .map((l) => {
        let { startStepIndex, endStepIndex } = l;
        if (deleteIdx < startStepIndex) {
          startStepIndex = Math.max(0, startStepIndex - 1);
          endStepIndex = Math.max(0, endStepIndex - 1);
        } else if (deleteIdx <= endStepIndex) {
          endStepIndex = Math.max(startStepIndex, endStepIndex - 1);
        }
        return { ...l, startStepIndex, endStepIndex };
      })
      .filter((l) => l.startStepIndex < l.endStepIndex && l.endStepIndex < newSteps.length);

    setProtocol({
      ...protocol,
      steps: newSteps,
      loops: newLoops,
    });
    setSelectedStepIndex(Math.max(0, deleteIdx - 1));
  };

  // Modify Step Temperature
  const handleSaveTemperature = (newTemp: number) => {
    const newSteps = [...protocol.steps];
    if (newSteps[selectedStepIndex]) {
      newSteps[selectedStepIndex] = {
        ...newSteps[selectedStepIndex],
        temperature: newTemp,
      };
      setProtocol({ ...protocol, steps: newSteps });
    }
  };

  // Modify Step Duration
  const handleSaveDuration = (newSeconds: number, isInfinite?: boolean) => {
    const newSteps = [...protocol.steps];
    if (newSteps[selectedStepIndex]) {
      newSteps[selectedStepIndex] = {
        ...newSteps[selectedStepIndex],
        durationSeconds: newSeconds,
        isInfiniteHold: isInfinite,
      };
      setProtocol({ ...protocol, steps: newSteps });
    }
  };

  // Save Gradient Config
  const handleSaveGradient = (config: GradientConfig | undefined) => {
    const newSteps = [...protocol.steps];
    if (newSteps[selectedStepIndex]) {
      newSteps[selectedStepIndex] = {
        ...newSteps[selectedStepIndex],
        gradient: config,
      };
      setProtocol({ ...protocol, steps: newSteps });
    }
  };

  // Save Cycle Loop
  const handleSaveLoop = (loop: PCRCycleLoop) => {
    setProtocol({
      ...protocol,
      loops: [loop],
    });
  };

  // Load Protocol
  const handleLoadProtocol = (loaded: PCRProtocol) => {
    setProtocol(loaded);
    setSelectedStepIndex(0);
  };

  // Save Current Protocol
  const handleSaveUserProtocol = (name: string, description: string) => {
    const newProto: PCRProtocol = {
      ...protocol,
      id: 'proto_' + Date.now(),
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      isPreset: false,
    };
    setUserProtocols((prev) => [newProto, ...prev]);
    setProtocol(newProto);
  };

  // Delete User Protocol
  const handleDeleteUserProtocol = (id: string) => {
    setUserProtocols((prev) => prev.filter((p) => p.id !== id));
  };

  // Update Settings
  const handleUpdateSettings = (settings: {
    lidTemperature: number;
    lidHeatingEnabled: boolean;
    sampleVolume: number;
  }) => {
    setProtocol({
      ...protocol,
      ...settings,
    });
  };

  const isRunning = progressState.state !== 'idle';
  const currentStep = protocol.steps[selectedStepIndex] || protocol.steps[0];

  // Programa enviado desde el editor: se carga si el equipo no está en marcha.
  const loadRequest = useInstrument(s => s.loadRequest);
  useEffect(() => {
    if (!loadRequest || (isRunning && progressState.state !== 'completed')) return;
    const next = instrument.takeLoadRequest();
    if (!next) return;
    if (progressState.state === 'completed') stopRun();
    setProtocol(next);
    setSelectedStepIndex(0);
  }, [loadRequest, isRunning, progressState.state, stopRun]);

  // Lecturas para el resto de la interfaz.
  useEffect(() => {
    const p = progressState;
    const done = p.state === 'completed';
    const total = p.totalElapsedSeconds + p.estimatedRemainingSeconds;
    instrument.publish({
      run: p.state,
      blockTemperature: p.currentBlockTemp,
      lidTemperature: p.currentLidTemp,
      lidTarget: p.targetLidTemp,
      protocolName: protocol.name,
      stepName: isRunning ? protocol.steps[p.currentStepIndex]?.name ?? null : null,
      cycle: p.currentCycle,
      totalCycles: protocol.loops[0]?.repeatCount ?? 0,
      remainingSeconds: p.estimatedRemainingSeconds,
      progress: done || p.state === 'holding' ? 1 : total > 0 ? p.totalElapsedSeconds / total : 0,
    });
  }, [progressState, protocol, isRunning]);

  return (
    <div className="cycler flex-1 min-h-full flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Telemetry & Status Bar */}
      <TopStatusBar
        protocol={protocol}
        runProgress={progressState}
        onOpenLibrary={() => setActiveModal('protocol_library')}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenWellPlate={() => setActiveModal('well_plate')}
      />

      {/* Main Workspace Stage */}
      {isRunning ? (
        <RunMonitorScreen
          protocol={protocol}
          runProgress={progressState}
          onPause={pauseRun}
          onResume={resumeRun}
          onStop={stopRun}
          onAdvanceStep={advanceStep}
          onSkipPreheat={skipPreheatingLid}
          onSetSimSpeed={setSimSpeed}
          onBackToEditor={stopRun}
        />
      ) : (
        <main className="flex-1 flex flex-col p-3 sm:p-4 gap-3 bg-slate-950 overflow-hidden">
          {/* Main Visual PCR Profile Graph */}
          <div className="flex-1 w-full min-h-[340px]">
            <ThermalProfileGraph
              protocol={protocol}
              selectedStepIndex={selectedStepIndex}
              onSelectStep={handleSelectStep}
              onEditTemperature={(idx) => {
                setSelectedStepIndex(idx);
                setActiveModal('temp_numpad');
              }}
              onEditTime={(idx) => {
                setSelectedStepIndex(idx);
                setActiveModal('time_numpad');
              }}
              onEditLoop={() => setActiveModal('cycle_loop')}
              onOpenGradient={(idx) => {
                setSelectedStepIndex(idx);
                setActiveModal('gradient');
              }}
              runProgress={progressState}
            />
          </div>

          {/* Bottom Action Toolbar */}
          <BottomToolbar
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
            onOpenLoop={() => setActiveModal('cycle_loop')}
            onOpenGradient={() => setActiveModal('gradient')}
            onOpenSave={() => setActiveModal('protocol_library')}
            onStartRun={() => {
              playConfirmBeep();
              startRun();
            }}
            canDelete={protocol.steps.length > 2}
            isGradientActive={Boolean(currentStep?.gradient?.enabled)}
            isRunning={isRunning}
          />
        </main>
      )}

      {/* Modals & Touch Panels */}
      {activeModal === 'temp_numpad' && (
        <TouchNumpadModal
          mode="temperature"
          stepName={currentStep.name}
          stepNumber={selectedStepIndex + 1}
          initialValue={currentStep.temperature}
          onSave={(val) => handleSaveTemperature(val)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'time_numpad' && (
        <TouchNumpadModal
          mode="time"
          stepName={currentStep.name}
          stepNumber={selectedStepIndex + 1}
          initialValue={currentStep.durationSeconds}
          isInfiniteHold={currentStep.isInfiniteHold}
          onSave={(val, isInf) => handleSaveDuration(val, isInf)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'gradient' && (
        <GradientModal
          stepName={currentStep.name}
          stepNumber={selectedStepIndex + 1}
          initialGradient={currentStep.gradient}
          currentStepTemp={currentStep.temperature}
          onSave={handleSaveGradient}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'cycle_loop' && (
        <CycleLoopModal
          steps={protocol.steps}
          currentLoop={protocol.loops[0]}
          onSave={handleSaveLoop}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'protocol_library' && (
        <ProtocolLibraryModal
          currentProtocol={protocol}
          userProtocols={userProtocols}
          onLoadProtocol={handleLoadProtocol}
          onSaveCurrentProtocol={handleSaveUserProtocol}
          onDeleteProtocol={handleDeleteUserProtocol}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <InstrumentSettingsModal
          protocol={protocol}
          onUpdateProtocolSettings={handleUpdateSettings}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'well_plate' && (
        <Plate96View
          protocol={protocol}
          activeStep={currentStep}
          currentBlockTemp={progressState.currentBlockTemp}
          onClose={() => setActiveModal(null)}
          isModal={true}
        />
      )}
    </div>
  );
}
