import { useClientStore } from "../../store/clientStore";
import type { ClientState } from "../../types/client";

const typeBadge: Record<string, string> = {
  Desktop: "bg-surface-overlay text-text-muted",
  IDE: "bg-surface-overlay text-text-muted",
  CLI: "bg-surface-overlay text-text-muted",
  Web: "bg-surface-overlay text-text-muted",
  Framework: "bg-surface-overlay text-text-muted",
};

function ClientCard({ client }: { client: ClientState }) {
  const { selectedClientId, selectClient } = useClientStore();
  const { meta, installed, configExists, serverCount } = client;
  const isSelected = selectedClientId === meta.id;
  const isRemote = meta.detection.kind === "none";

  return (
    <button
      onClick={() => selectClient(isSelected ? null : meta.id)}
      className={`w-full rounded-lg border p-5 text-left transition-colors ${
        isSelected
          ? "border-primary/40 bg-primary/5"
          : "border-border-hover bg-surface hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">{meta.name}</span>
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${typeBadge[meta.type]}`}>
              {meta.type}
            </span>
          </div>
          {meta.configPath && (
            <p className="mt-2 truncate font-mono text-xs text-text-muted">{meta.configPath}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {installed && configExists && serverCount !== null && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
              {serverCount} server{serverCount !== 1 ? "s" : ""}
            </span>
          )}
          {isRemote ? (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-2 w-2 rounded-full bg-text-muted/40" />
              Remote
            </span>
          ) : installed ? (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
              Installed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-2 w-2 rounded-full bg-text-muted/40" />
              Not detected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default ClientCard;
