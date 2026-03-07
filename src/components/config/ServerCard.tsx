import type { TransportType } from "../../types/config";

interface Props {
  name: string;
  data: Record<string, unknown>;
  onEdit: () => void;
  onDelete: () => void;
}

const transportBadge: Record<TransportType, string> = {
  stdio: "bg-primary/15 text-primary",
  sse: "bg-surface-overlay text-text-muted",
  "streamable-http": "bg-surface-overlay text-text-muted",
  "remote-mcp": "bg-surface-overlay text-text-muted",
};

const transportLabel: Record<TransportType, string> = {
  stdio: "stdio",
  sse: "sse",
  "streamable-http": "streamable-http",
  "remote-mcp": "remote-mcp",
};

function detectTransport(data: Record<string, unknown>): TransportType {
  if (
    data.command === "npx" &&
    Array.isArray(data.args) &&
    (data.args as string[]).includes("mcp-remote")
  ) {
    return "remote-mcp";
  }
  if (data.url) {
    return String(data.url).includes("/sse") ? "sse" : "streamable-http";
  }
  return "stdio";
}

function ServerCard({ name, data, onEdit, onDelete }: Props) {
  const transport = detectTransport(data);
  const command = data.command as string | undefined;
  const url = data.url as string | undefined;
  const args = data.args as string[] | undefined;
  const env = data.env as Record<string, string> | undefined;
  const envCount = env ? Object.keys(env).length : 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 group hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium font-mono truncate">{name}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${transportBadge[transport]}`}
          >
            {transportLabel[transport]}
          </span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-[11px] px-2 py-1 rounded border border-border text-text-muted hover:text-text hover:border-border-hover hover:bg-surface-hover transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-[11px] px-2 py-1 rounded border border-border text-text-muted hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="space-y-1 min-w-0">
        {transport === "remote-mcp" ? (
          <p className="text-xs text-text-muted font-mono truncate">
            {args?.find((a) => a.startsWith("http")) ?? ""}
          </p>
        ) : command ? (
          <p className="text-xs text-text-muted font-mono truncate">
            {command}{args && args.length > 0 ? ` ${args.join(" ")}` : ""}
          </p>
        ) : null}
        {url && (
          <p className="text-xs text-text-muted font-mono truncate">{url}</p>
        )}
        {envCount > 0 && (
          <p className="text-[11px] text-text-muted">
            {envCount} env variable{envCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export default ServerCard;
