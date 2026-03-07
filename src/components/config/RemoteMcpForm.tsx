import { useState } from "react";

export interface RemoteMcpData {
  url: string;
  authToken: string;
}

interface Props {
  url: string;
  authToken: string;
  onChange: (data: RemoteMcpData) => void;
}

function RemoteMcpForm({ url, authToken, onChange }: Props) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">Remote MCP URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => onChange({ url: e.target.value, authToken })}
          placeholder="https://your-server.example.com/mcp"
          className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
        />
        <p className="mt-1 text-[10px] text-text-muted">
          Supports Streamable HTTP and SSE endpoints
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">
          Auth Token{" "}
          <span className="text-text-muted/60 font-normal">(optional — Bearer)</span>
        </label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={authToken}
            onChange={(e) => onChange({ url, authToken: e.target.value })}
            placeholder="sk-..."
            className="w-full px-2.5 py-1.5 pr-16 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={() => setShowToken((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text"
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          Adds <code className="font-mono">--header &quot;Authorization: Bearer …&quot;</code> to the command
        </p>
      </div>

      <div className="rounded-md bg-surface-overlay border border-border px-3 py-2">
        <p className="text-[10px] text-text-muted leading-relaxed">
          Uses{" "}
          <code className="font-mono">npx mcp-remote</code> as a local bridge.
          Requires Node.js ≥ 18. Opens a browser for OAuth if the server requires it.
        </p>
      </div>
    </div>
  );
}

export default RemoteMcpForm;
