import { useCallback } from 'react';
import { ProtocolEditor } from '../components/ProtocolEditor';
import { ThermalProfile } from '../components/ThermalProfile';
import { useCyclerStore } from '../cycler/store';
import { fromCyclerProtocol, toCyclerProtocol } from '../lib/toCycler';
import { useApp } from '../state/app';
import { isActiveRun, useInstrument } from '../state/instrument';

// Pantalla de programación: editor a la izquierda y vista previa del
// perfil térmico a la derecha. "Cargar en el termociclador" convierte el
// protocolo al formato del equipo, lo carga y abre su panel.
export default function ProgramView() {
  const editor = useApp(s => s.editor);
  const setEditor = useApp(s => s.setEditor);
  const draft = useApp(s => s.draft);
  const goTo = useApp(s => s.goTo);
  const locked = useInstrument(s => isActiveRun(s.run));

  const send = useCallback(() => {
    const machine = useCyclerStore.getState().protocol;
    useCyclerStore.getState().setProtocol(toCyclerProtocol(draft, machine));
    goTo('run');
  }, [draft, goTo]);

  const pull = useCallback(() => {
    setEditor(fromCyclerProtocol(useCyclerStore.getState().protocol));
  }, [setEditor]);

  return (
    <div className="program">
      <ProtocolEditor state={editor} onChange={setEditor} onSave={send} onPull={pull} locked={locked} />
      <div className="program__preview">
        <ThermalProfile protocol={draft} />
      </div>
    </div>
  );
}
