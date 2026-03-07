import { useState } from "react";
import type { TransportType } from "../../types/config";
import TransportSelector from "./TransportSelector";
import StdioForm from "./StdioForm";
import HttpForm from "./HttpForm";
import RemoteMcpForm from "./RemoteMcpForm";

interface Props {
  name: string;
  data: Record<string, unknown>;
  supportedTransports: TransportType[];
  onSave: (name: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

function isRemoteMcp(data: Record<string, unknown>): boolean {
  return (
    data.command === "npx" &&
    Array.isArray(data.args) &&
    (data.args as string[]).includes("mcp-remote")
  );
}

function detectTransport(data: Record<string, unknown>): TransportType {
  if (isRemoteMcp(data)) return "remote-mcp";
  if (data.url) {
    return String(data.url).includes("/sse") ? "sse" : "streamable-http";
  }
  return "stdio";
}

function extractRemoteMcpUrl(data: Record<string, unknown>): string {
  const args = data.args as string[];
  const idx = args.indexOf("mcp-remote");
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : "";
}

function extractRemoteMcpToken(data: Record<string, unknown>): string {
  const args = data.args as string[];
  const idx = args.indexOf("--header");
  if (idx >= 0 && idx + 1 < args.length) {
    const match = String(args[idx + 1]).match(/^Authorization:\s*Bearer\s+(.+)$/);
    if (match) return match[1];
  }
  return "";
}

function buildRemoteMcpArgs(url: string, authToken: string): string[] {
  const args = ["-y", "mcp-remote", url];
  if (authToken.trim()) {
    args.push("--header", `Authorization: Bearer ${authToken.trim()}`);
  }
  return args;
}

function EditServerDialog({ name, data, supportedTransports, onSave, onClose }: Props) {
  const [transport, setTransport] = useState<TransportType>(detectTransport(data));
  const [command, setCommand] = useState((data.command as string) ?? "");
  const [args, setArgs] = useState<string[]>((data.args as string[]) ?? []);
  const [env, setEnv] = useState<Record<string, string>>((data.env as Record<string, string>) ?? {});
  const [url, setUrl] = useState((data.url as string) ?? "");
  const [headers, setHeaders] = useState<Record<string, string>>((data.headers as Record<string, string>) ?? {});
  const [remoteUrl, setRemoteUrl] = useState(isRemoteMcp(data) ? extractRemoteMcpUrl(data) : "");
  const [remoteAuthToken, setRemoteAuthToken] = useState(isRemoteMcp(data) ? extractRemoteMcpToken(data) : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newData: Record<string, unknown>;
    if (transport === "stdio") {
      newData = { command, args: args.length > 0 ? args : undefined };
      if (Object.keys(env).length > 0) newData.env = env;
    } else if (transport === "remote-mcp") {
      newData = { command: "npx", args: buildRemoteMcpArgs(remoteUrl, remoteAuthToken) };
    } else {
      newData = { url };
      if (Object.keys(headers).length > 0) newData.headers = headers;
    }
    onSave(name, newData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-md shadow-2xl space-y-4"
      >
        <h3 className="text-sm font-semibold">
          Edit Server: <span className="font-mono text-primary">{name}</span>
        </h3>

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
            disabled={transport === "remote-mcp" && !remoteUrl.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditServerDialog;
