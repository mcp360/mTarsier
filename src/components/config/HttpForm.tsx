import { useState } from "react";

interface Props {
  url: string;
  headers: Record<string, string>;
  onChange: (data: { url: string; headers: Record<string, string> }) => void;
}

function HttpForm({ url, headers, onChange }: Props) {
  const [showValues, setShowValues] = useState(false);
  const entries = Object.entries(headers);

  const addHeader = () => {
    onChange({ url, headers: { ...headers, "": "" } });
  };

  const updateHeaderKey = (_oldKey: string, newKey: string, idx: number) => {
    const newHeaders: Record<string, string> = {};
    entries.forEach(([k, v], i) => {
      newHeaders[i === idx ? newKey : k] = v;
    });
    onChange({ url, headers: newHeaders });
  };

  const updateHeaderValue = (key: string, val: string) => {
    onChange({ url, headers: { ...headers, [key]: val } });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    onChange({ url, headers: newHeaders });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => onChange({ url: e.target.value, headers })}
          placeholder="http://localhost:3000/sse"
          className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-muted">Headers</label>
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
              onChange={(e) => updateHeaderKey(key, e.target.value, idx)}
              placeholder="Header-Name"
              className="flex-1 px-2 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
            />
            <input
              type={showValues ? "text" : "password"}
              value={val}
              onChange={(e) => updateHeaderValue(key, e.target.value)}
              placeholder="value"
              className="flex-1 px-2 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={() => removeHeader(key)}
              className="text-text-muted hover:text-red-400 text-xs px-1"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addHeader}
          className="text-xs text-primary/70 hover:text-primary"
        >
          + Add header
        </button>
      </div>
    </div>
  );
}

export default HttpForm;
