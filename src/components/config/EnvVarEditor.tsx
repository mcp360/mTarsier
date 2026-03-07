import { useState } from "react";

interface Props {
  value: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}

function EnvVarEditor({ value, onChange }: Props) {
  const [showValues, setShowValues] = useState(false);
  const entries = Object.entries(value);

  const addRow = () => {
    onChange({ ...value, "": "" });
  };

  const updateKey = (_oldKey: string, newKey: string, idx: number) => {
    const newEnv: Record<string, string> = {};
    entries.forEach(([k, v], i) => {
      newEnv[i === idx ? newKey : k] = v;
    });
    onChange(newEnv);
  };

  const updateValue = (key: string, newVal: string) => {
    onChange({ ...value, [key]: newVal });
  };

  const removeRow = (key: string) => {
    const newEnv = { ...value };
    delete newEnv[key];
    onChange(newEnv);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-muted">Environment Variables</label>
        <button
          type="button"
          onClick={() => setShowValues(!showValues)}
          className="text-[10px] text-text-muted hover:text-text"
        >
          {showValues ? "Hide values" : "Show values"}
        </button>
      </div>
      {entries.map(([key, val], idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            value={key}
            onChange={(e) => updateKey(key, e.target.value, idx)}
            placeholder="KEY"
            className="flex-1 px-2 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
          />
          <input
            type={showValues ? "text" : "password"}
            value={val}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder="value"
            className="flex-1 px-2 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={() => removeRow(key)}
            className="text-text-muted hover:text-red-400 text-xs px-1"
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-primary/70 hover:text-primary"
      >
        + Add variable
      </button>
    </div>
  );
}

export default EnvVarEditor;
