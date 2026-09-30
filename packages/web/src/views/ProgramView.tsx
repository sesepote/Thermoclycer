import { useCallback } from 'react';
import { ProtocolEditor } from '../components/ProtocolEditor';
import { ThermalProfile } from '../components/ThermalProfile';
import { toCyclerProtocol } from '../lib/toCycler';
import { useApp } from '../state/app';
import { instrument, isActiveRun, useInstrument } from '../state/instrument';

// Pantalla de programación: editor a la izquierda y vista previa del
// perfil térmico a la derecha. "Cargar en el termociclador" convierte el
// protocolo al formato del equipo, se lo envía y abre su panel.
export default function ProgramView() {
  const { editor, setEditor, draft, goTo } = useApp();
  const locked = useInstrument(s => isActiveRun(s.run));

  const send = useCallback(() => {
    instrument.requestLoad(toCyclerProtocol(draft));
    goTo('run');
  }, [draft, goTo]);

  return (
    <div className="program">
      <ProtocolEditor state={editor} onChange={setEditor} onSave={send} locked={locked} />
      <div className="program__preview">
        <ThermalProfile protocol={draft} />
      </div>
    </div>
  );
}
