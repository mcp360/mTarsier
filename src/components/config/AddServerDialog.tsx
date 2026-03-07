import { useState } from "react";
import type { TransportType } from "../../types/config";
import TransportSelector from "./TransportSelector";
import StdioForm from "./StdioForm";
import HttpForm from "./HttpForm";
import RemoteMcpForm from "./RemoteMcpForm";

interface Props {
  supportedTransports: TransportType[];
  onAdd: (name: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

function buildRemoteMcpArgs(url: string, authToken: string): string[] {
  const args = ["-y", "mcp-remote", url];
  if (authToken.trim()) {
    args.push("--header", `Authorization: Bearer ${authToken.trim()}`);
  }
  return args;
}

function AddServerDialog({ supportedTransports, onAdd, onClose }: Props) {
  const defaultTransport = supportedTransports[0] ?? "stdio";
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<TransportType>(defaultTransport);
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState<string[]>([]);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteAuthToken, setRemoteAuthToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let data: Record<string, unknown>;
    if (transport === "stdio") {
      data = { command, args: args.length > 0 ? args : undefined };
      if (Object.keys(env).length > 0) data.env = env;
    } else if (transport === "remote-mcp") {
      data = { command: "npx", args: buildRemoteMcpArgs(remoteUrl, remoteAuthToken) };
    } else {
      data = { url };
      if (Object.keys(headers).length > 0) data.headers = headers;
    }
    onAdd(name.trim(), data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-md shadow-2xl space-y-4"
      >
        <h3 className="text-sm font-semibold">Add MCP Server</h3>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">Server Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-server"
            autoFocus
            className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">Transport</label>
          <TransportSelector
            value={transport}
            onChange={setTransport}
            supportedTransports={supportedTransports}
          />
        </div>

        {transport === "stdio" ? (
          <StdioForm
            command={command}
            args={args}
            env={env}
            onChange={(d) => { setCommand(d.command); setArgs(d.args); setEnv(d.env); }}
          />
        ) : transport === "remote-mcp" ? (
          <RemoteMcpForm
            url={remoteUrl}
            authToken={remoteAuthToken}
            onChange={(d) => { setRemoteUrl(d.url); setRemoteAuthToken(d.authToken); }}
          />
        ) : (
          <HttpForm
            url={url}
            headers={headers}
            onChange={(d) => { setUrl(d.url); setHeaders(d.headers); }}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || (transport === "remote-mcp" && !remoteUrl.trim())}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Server
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddServerDialog;
