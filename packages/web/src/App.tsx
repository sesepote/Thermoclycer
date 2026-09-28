import { useCallback, useMemo, useRef, useState } from 'react';
import { Protocol, SimulationController, SimulationSpeed } from '@thermocycler/core';
import { AppHeader, AppTab } from './components/AppHeader';
import { ProtocolEditor } from './components/ProtocolEditor';
import { DevicePanel } from './components/DevicePanel';
import { ThermalProfile } from './components/ThermalProfile';
import { PrimerLab } from './components/PrimerLab';
import { EvaluationPanel } from './components/EvaluationPanel';
import { KnowledgePanel } from './components/KnowledgePanel';
import { useSimulationClock } from './hooks/useSimulationClock';
import { EditorState, buildProtocol, defaultEditorState, protocolToEditorState } from './lib/editorState';

export default function App() {
  const [tab, setTab] = useState<AppTab>('simulator');
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  const [programmed, setProgrammed] = useState<Protocol | null>(null);
  const controllerRef = useRef(new SimulationController());
  const [snapshot, setSnapshot] = useState(() => controllerRef.current.snapshot());
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useSimulationClock(controllerRef.current, snapshot.state === 'RUNNING', setSnapshot);

  const draftProtocol = useMemo(() => buildProtocol(editorState), [editorState]);
  const isDirty = useMemo(
    () => programmed === null || JSON.stringify(programmed) !== JSON.stringify(draftProtocol),
    [programmed, draftProtocol],
  );

  const annealingTemperature = useMemo(
    () => editorState.steps.find(s => s.type === 'annealing')?.temperature,
    [editorState.steps],
  );

  const refresh = () => setSnapshot(controllerRef.current.snapshot());

  const handleSave = useCallback(() => {
    const result = controllerRef.current.program(draftProtocol);
    setProgrammed(result.ok ? draftProtocol : null);
    refresh();
  }, [draftProtocol]);

  const handlePlay = useCallback(() => {
    controllerRef.current.play();
    refresh();
  }, []);

  const handlePause = useCallback(() => {
    controllerRef.current.pause();
    refresh();
  }, []);

  const handleStop = useCallback(() => {
    controllerRef.current.stop();
    refresh();
  }, []);

  const handleSpeedChange = useCallback((next: SimulationSpeed) => {
    controllerRef.current.setSpeed(next);
    setSpeed(next);
  }, []);

  const handleApplyAnnealing = useCallback((temperature: number) => {
    setEditorState(prev => ({
      ...prev,
      steps: prev.steps.map(s => (s.type === 'annealing' ? { ...s, temperature } : s)),
    }));
    setTab('simulator');
  }, []);

  const handleLoadProtocol = useCallback((protocol: Protocol) => {
    setEditorState(protocolToEditorState(protocol));
    setTab('simulator');
  }, []);

  return (
    <div className="app">
      <AppHeader tab={tab} onTabChange={setTab} snapshot={snapshot} />

      <main className="app__main">
        {tab === 'simulator' && (
          <div className="sim-layout">
            <ProtocolEditor
              state={editorState}
              onChange={setEditorState}
              onSave={handleSave}
              isDirty={isDirty}
              locked={snapshot.state === 'RUNNING'}
              validationError={snapshot.state === 'ERROR' ? snapshot.error : undefined}
            />
            <div className="sim-layout__right">
              <DevicePanel
                snapshot={snapshot}
                protocol={programmed}
                speeds={controllerRef.current.getAllowedSpeeds()}
                currentSpeed={speed}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSpeedChange={handleSpeedChange}
              />
              <ThermalProfile
                protocol={programmed ?? draftProtocol}
                isDraft={programmed === null}
                elapsedSeconds={snapshot.elapsedSeconds}
                active={programmed !== null && snapshot.state !== 'IDLE'}
              />
            </div>
          </div>
        )}

        {tab === 'primers' && (
          <PrimerLab annealingTemperature={annealingTemperature} onApplyAnnealing={handleApplyAnnealing} />
        )}

        {tab === 'evaluation' && <EvaluationPanel draft={draftProtocol} onLoadProtocol={handleLoadProtocol} />}

        {tab === 'knowledge' && <KnowledgePanel annealingTemperature={annealingTemperature} />}
      </main>
    </div>
  );
}
