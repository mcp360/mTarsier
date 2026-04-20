import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlowServer {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

interface FlowSkill {
  name: string;
  description: string;
  content: string;
}

interface FlowClient {
  id: string;
  name: string;
  servers: FlowServer[];
  skills: FlowSkill[];
}

interface FlowExport {
  version: string;
  exported_at: string;
  clients: FlowClient[];
}

interface Props { onClose: () => void }

type ExportTab = "mcp" | "skills";

function serverSummary(s: FlowServer): string {
  if (s.command) return `${s.command}${s.args?.length ? ` ${s.args.join(" ")}` : ""}`;
  if (s.url) return s.url;
  return "";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExportFlowDialog({ onClose }: Props) {
  const [tab, setTab] = useState<ExportTab>("mcp");
  const [flowData, setFlowData] = useState<FlowExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  // Load all available data on mount
  useEffect(() => {
    invoke<string>("export_flow")
      .then((json) => {
        const parsed = JSON.parse(json) as FlowExport;
        setFlowData(parsed);
        // Select all by default
        setSelectedServers(new Set(parsed.clients.flatMap((c) => c.servers.map((s) => `${c.id}::${s.name}`))));
        setSelectedSkills(new Set(parsed.clients.flatMap((c) => c.skills.map((s) => `${c.id}::${s.name}`))));
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const clientsWithServers = flowData?.clients.filter((c) => c.servers.length > 0) ?? [];
  const clientsWithSkills = flowData?.clients.filter((c) => c.skills.length > 0) ?? [];
  const allServers = clientsWithServers.flatMap((c) => c.servers);
  const allSkills = clientsWithSkills.flatMap((c) => c.skills);

  function toggleServer(key: string) {
    setSelectedServers((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleSkill(key: string) {
    setSelectedSkills((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  async function handleExport() {
    if (!flowData) return;
    setExporting(true);
    setExportError(null);
    try {
      const filtered: FlowExport = {
        ...flowData,
        clients: flowData.clients
          .map((c) => ({
            ...c,
            servers: c.servers.filter((s) => selectedServers.has(`${c.id}::${s.name}`)),
            skills: c.skills.filter((s) => selectedSkills.has(`${c.id}::${s.name}`)),
          }))
          .filter((c) => c.servers.length > 0 || c.skills.length > 0),
      };
      const saved = await invoke<boolean>("export_tsr", {
        content: JSON.stringify(filtered, null, 2),
        filename: "mtarsier-flow.json",
      });
      if (saved) { setExportDone(true); setTimeout(onClose, 800); }
    } catch (e) {
      setExportError(String(e));
    } finally {
      setExporting(false);
    }
  }

  const totalSelected = selectedServers.size + selectedSkills.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold">Export Flow</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text rounded p-0.5 cursor-pointer">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-xs text-text-muted">Loading your data…</p>
          </div>
        )}

        {loadError && (
          <div className="px-5 py-4">
            <p className="text-xs text-red-400">{loadError}</p>
          </div>
        )}

        {/* Tabs + content */}
        {flowData && !loading && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-5 border-b border-border flex-shrink-0">
              {(["mcp", "skills"] as ExportTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "text-xs px-3 py-2 border-b-2 -mb-px transition-colors cursor-pointer",
                    tab === t ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
                  )}
                >
                  {t === "mcp"
                    ? <span>MCP Servers <span className="ml-1 text-[10px] opacity-70">{selectedServers.size}/{allServers.length}</span></span>
                    : <span>Skills <span className="ml-1 text-[10px] opacity-70">{selectedSkills.size}/{allSkills.length}</span></span>
                  }
                </button>
              ))}
            </div>

            {/* Select/Deselect all bar */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-border flex-shrink-0">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                {tab === "mcp" ? "Choose servers to export" : "Choose skills to export"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => tab === "mcp"
                    ? setSelectedServers(new Set(clientsWithServers.flatMap((c) => c.servers.map((s) => `${c.id}::${s.name}`))))
                    : setSelectedSkills(new Set(clientsWithSkills.flatMap((c) => c.skills.map((s) => `${c.id}::${s.name}`))))
                  }
                  className="text-[10px] text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-text-muted/30 text-[10px]">|</span>
                <button
                  onClick={() => tab === "mcp"
                    ? setSelectedServers(new Set())
                    : setSelectedSkills(new Set())
                  }
                  className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Deselect all
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">

              {/* MCP tab */}
              {tab === "mcp" && (
                allServers.length === 0
                  ? <p className="text-xs text-text-muted text-center py-10">No MCP servers configured.</p>
                  : clientsWithServers.map((fc) => (
                    <div key={fc.id} className="border-b border-border last:border-b-0">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-5 pt-3 pb-1.5">
                        {fc.name}
                      </p>
                      <div className="px-4 pb-3 space-y-1.5">
                        {fc.servers.map((s) => {
                          const key = `${fc.id}::${s.name}`;
                          const summary = serverSummary(s);
                          return (
                            <label
                              key={key}
                              className={cn(
                                "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                                selectedServers.has(key) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-hover"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedServers.has(key)}
                                onChange={() => toggleServer(key)}
                                className="mt-0.5 accent-primary flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-mono font-medium text-text truncate">{s.name}</p>
                                {summary && (
                                  <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">{summary}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}

              {/* Skills tab */}
              {tab === "skills" && (
                allSkills.length === 0
                  ? <p className="text-xs text-text-muted text-center py-10">No skills installed.</p>
                  : clientsWithSkills.map((fc) => (
                    <div key={fc.id} className="border-b border-border last:border-b-0">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-5 pt-3 pb-1.5">
                        {fc.name}
                      </p>
                      <div className="px-4 pb-3 space-y-1.5">
                        {fc.skills.map((s) => {
                          const key = `${fc.id}::${s.name}`;
                          return (
                          <label
                            key={key}
                            className={cn(
                              "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                              selectedSkills.has(key) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-hover"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSkills.has(key)}
                              onChange={() => toggleSkill(key)}
                              className="mt-0.5 accent-primary flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-mono font-medium text-text truncate">{s.name}</p>
                              {s.description && (
                                <p className="text-[11px] text-text-muted truncate mt-0.5">{s.description}</p>
                              )}
                            </div>
                          </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        )}

        {exportError && (
          <div className="px-5 py-2 flex-shrink-0">
            <p className="text-xs text-red-400">{exportError}</p>
          </div>
        )}

        {exportDone && (
          <div className="px-5 py-2 flex-shrink-0">
            <p className="text-xs text-primary">Flow exported successfully.</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md cursor-pointer"
          >
            {exportDone ? "Close" : "Cancel"}
          </button>
          {!exportDone && (
            <button
              onClick={handleExport}
              disabled={exporting || totalSelected === 0 || loading}
              className="px-3.5 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {exporting
                ? "Exporting…"
                : `Export ${selectedServers.size > 0 ? `${selectedServers.size} server${selectedServers.size !== 1 ? "s" : ""}` : ""}${selectedServers.size > 0 && selectedSkills.size > 0 ? " + " : ""}${selectedSkills.size > 0 ? `${selectedSkills.size} skill${selectedSkills.size !== 1 ? "s" : ""}` : ""}`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
