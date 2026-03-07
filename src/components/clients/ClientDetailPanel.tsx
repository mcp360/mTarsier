import { useClientStore } from "../../store/clientStore";
import McpServerList from "./McpServerList";

const typeBadge: Record<string, string> = {
  Desktop: "bg-surface-overlay text-text-muted",
  IDE: "bg-surface-overlay text-text-muted",
  CLI: "bg-surface-overlay text-text-muted",
  Web: "bg-surface-overlay text-text-muted",
  Framework: "bg-surface-overlay text-text-muted",
};

function ClientDetailPanel() {
  const { clients, selectedClientId, selectClient } = useClientStore();
  const client = clients.find((c) => c.meta.id === selectedClientId);

  if (!client) return null;

  const { meta, installed, configExists } = client;
  const isRemote = meta.detection.kind === "none";

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-text">{meta.name}</h3>
        <button
          onClick={() => selectClient(null)}
          className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type + status */}
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${typeBadge[meta.type]}`}>
            {meta.type}
          </span>
          {isRemote ? (
            <span className="text-xs text-text-muted">Remote — no local config</span>
          ) : installed ? (
            <span className="text-xs text-primary">Installed</span>
          ) : (
            <span className="text-xs text-text-muted">Not detected</span>
          )}
        </div>

        {/* Local config info */}
        {!isRemote && meta.configPath && (
          <div>
            <p className="text-xs text-text-muted">Config path</p>
            <p className="mt-0.5 break-all font-mono text-xs text-text">{meta.configPath}</p>
          </div>
        )}

        {/* Supported transports for remote clients */}
        {isRemote && meta.supportedTransports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {meta.supportedTransports.map((t) => (
              <span
                key={t}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Setup guide for remote/web clients */}
        {isRemote && meta.setupSteps && meta.setupSteps.length > 0 && (
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              How to connect
            </p>
            <ol className="space-y-3">
              {meta.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    {step.text.includes("\n") ? (
                      <>
                        <p className="text-xs text-text">{step.text.split("\n")[0]}</p>
                        <pre className="mt-1 overflow-x-auto rounded bg-base-lighter px-2 py-1.5 font-mono text-[10px] text-text-muted whitespace-pre">
                          {step.text.split("\n").slice(1).join("\n")}
                        </pre>
                      </>
                    ) : (
                      <p className="text-xs text-text">{step.text}</p>
                    )}
                    {step.note && (
                      <p className="mt-1 text-[10px] text-text-muted/70">{step.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Docs link */}
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-primary hover:underline"
        >
          Documentation &rarr;
        </a>

        {/* Local MCP server list */}
        {installed && configExists && meta.configPath && meta.configKey && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-text">MCP Servers</h4>
            <McpServerList configPath={meta.configPath} configKey={meta.configKey} configFormat={meta.configFormat} />
          </div>
        )}

        {/* Edit config link for local clients */}
        {installed && meta.configPath && (
          <a
            href={`/config?client=${meta.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base-light px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-hover"
          >
            Edit Config
          </a>
        )}
      </div>
    </div>
  );
}

export default ClientDetailPanel;
