import { useCallback, useMemo } from 'react';
import { ProtocolEditor } from '../components/ProtocolEditor';
import { ThermalProfile } from '../components/ThermalProfile';
import { useApp } from '../state/app';
import { simulation, useSimulation } from '../state/simulation';

// Pantalla de programación: editor a la izquierda y vista previa del
// perfil térmico a la derecha. Al cargar el programa en el equipo se
// pasa al panel de ejecución, como en un termociclador real.
export default function ProgramView() {
  const { editor, setEditor, draft, goTo } = useApp();
  const status = useSimulation(s => s.snapshot.state);
  const error = useSimulation(s => s.snapshot.error);
  const programmed = useSimulation(s => s.programmed);

  const isDirty = useMemo(() => !programmed || JSON.stringify(programmed) !== JSON.stringify(draft), [programmed, draft]);
  const save = useCallback(() => {
    if (!isDirty || simulation.program(draft)) goTo('run');
  }, [isDirty, draft, goTo]);

  return (
    <div className="program">
      <ProtocolEditor
        state={editor}
        onChange={setEditor}
        onSave={save}
        isDirty={isDirty}
        locked={status === 'RUNNING'}
        validationError={status === 'ERROR' ? error : undefined}
      />
      <div className="program__preview">
        <ThermalProfile protocol={draft} isDraft={isDirty} active={false} />
      </div>
    </div>
  );
}
