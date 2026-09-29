import { useCallback, useMemo } from 'react';
import { ProtocolEditor } from '../components/ProtocolEditor';
import { DevicePanel } from '../components/DevicePanel';
import { ThermalProfile } from '../components/ThermalProfile';
import { useApp } from '../state/app';
import { simulation, useSimulation } from '../state/simulation';

// Vista principal: editor a la izquierda, equipo y perfil térmico a la
// derecha. Solo se suscribe a datos que cambian con poca frecuencia
// (estado, error, protocolo cargado); lo que cambia en cada frame lo
// leen directamente DevicePanel y el marcador del perfil.
export default function SimulatorView() {
  const { editor, setEditor, draft } = useApp();
  const status = useSimulation(s => s.snapshot.state);
  const error = useSimulation(s => s.snapshot.error);
  const programmed = useSimulation(s => s.programmed);

  const isDirty = useMemo(() => !programmed || JSON.stringify(programmed) !== JSON.stringify(draft), [programmed, draft]);
  const save = useCallback(() => simulation.program(draft), [draft]);

  return (
    <div className="sim-layout">
      <ProtocolEditor
        state={editor}
        onChange={setEditor}
        onSave={save}
        isDirty={isDirty}
        locked={status === 'RUNNING'}
        validationError={status === 'ERROR' ? error : undefined}
      />
      <div className="sim-layout__right">
        <DevicePanel />
        <ThermalProfile protocol={programmed ?? draft} isDraft={!programmed} active={!!programmed && status !== 'IDLE'} />
      </div>
    </div>
  );
}
