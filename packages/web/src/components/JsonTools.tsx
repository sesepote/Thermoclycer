import { useState } from 'react';
import { Braces, Download, Upload } from 'lucide-react';
import { Protocol, parseProtocolJson } from '@thermocycler/core';
import { EditorState, protocolToEditorState, protocolToJson } from '../lib/editorState';

interface JsonToolsProps {
  protocol: Protocol;
  disabled: boolean;
  onImport: (state: EditorState) => void;
}

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
      setCopied(false);
    }
  };

  const handleImport = () => {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      setErrors(['El texto no es JSON válido.']);
      return;
    }
    const result = parseProtocolJson(raw, 'importado');
    if (!result.ok) {
      setErrors(result.errors.map(e => `${e.path}: ${e.message}`));
      return;
    }
    setErrors([]);
    onImport(protocolToEditorState(result.protocol));
  };

  return (
    <details className="json-tools">
      <summary>
        <Braces size={16} aria-hidden="true" />
        Importar / exportar JSON
      </summary>
      <label className="sr-only" htmlFor="json-input">
        Protocolo en JSON
      </label>
      <textarea
        id="json-input"
        className="json-tools__input mono"
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
