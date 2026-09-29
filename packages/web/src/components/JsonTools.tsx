import { useState } from 'react';
import { Braces, Download, Upload } from 'lucide-react';
import { Protocol, parseProtocolJson } from '@thermocycler/core';
import { EditorState, protocolToEditorState, protocolToJson } from '../lib/editorState';

interface JsonToolsProps {
  protocol: Protocol;
  disabled: boolean;
  onImport: (state: EditorState) => void;
}

// Exporta el borrador a JSON (y al portapapeles) o importa uno pegado,
// validando su forma con el parser del core.
export function JsonTools({ protocol, disabled, onImport }: JsonToolsProps) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    const json = protocolToJson(protocol);
    setText(json);
    setErrors([]);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Sin permiso de portapapeles: el JSON queda igualmente en el área de texto.
    }
  };

  const handleImport = () => {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return setErrors(['El texto no es JSON válido.']);
    }
    const result = parseProtocolJson(raw, 'importado');
    if (!result.ok) return setErrors(result.errors.map(e => `${e.path}: ${e.message}`));
    setErrors([]);
    onImport(protocolToEditorState(result.protocol));
  };

  return (
    <details className="json-tools">
      <summary>
        <Braces size={16} aria-hidden="true" />
        Importar / exportar JSON
      </summary>
      <textarea
        className="json-tools__input mono"
        aria-label="Protocolo en JSON"
        rows={8}
        spellCheck={false}
        placeholder='{"cycles": {"count": 35, "steps": [...]}}'
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {errors.length > 0 && (
        <ul className="json-tools__errors">
          {errors.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="json-tools__actions">
        <button type="button" className="btn btn--ghost" onClick={handleExport}>
          <Download size={16} aria-hidden="true" />
          {copied ? 'Copiado' : 'Exportar actual'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleImport} disabled={disabled || !text.trim()}>
          <Upload size={16} aria-hidden="true" />
          Importar al editor
        </button>
      </div>
    </details>
  );
}
