import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../../store/configStore";
import { useClientStore } from "../../store/clientStore";
import { getConfigurableClients } from "../../lib/clients";
import type { ClientMeta } from "../../types/client";
import type { ProjectScope } from "../../store/configStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a .tsr or raw JSON string into a servers Record. */
function parseTsrContent(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if ("servers" in parsed && typeof parsed.servers === "object") {
      return parsed.servers as Record<string, unknown>;
    }
    return parsed as Record<string, unknown>;
  }
  return {};
}

/**
 * Build the dot-separated key to navigate based on scope:
 *   "user"  → "mcpServers"
 *   "local" → "projects.<homeDir>.mcpServers"
 *   <path>  → "projects.<path>.mcpServers"
 */
function buildEffectiveKey(client: ClientMeta, scope: string, homeDir: string): string {
  if (!client.supportsScopes) {
    // Replace {HOME} if present (e.g. Gemini CLI, Claude Code non-scoped access)
    return client.configKey.replace("{HOME}", homeDir);
  }
  if (scope === "user") return "mcpServers";
  if (scope === "local") return `projects.${homeDir}.mcpServers`;
  return `projects.${scope}.mcpServers`;
}

/** Navigate a dot-separated key path through a parsed JSON object. */
function navigateKey(obj: unknown, key: string): Record<string, unknown> {
  let cur: unknown = obj;
  for (const k of key.split(".")) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return {};
    }
  }
  return cur && typeof cur === "object" && !Array.isArray(cur)
    ? (cur as Record<string, unknown>)
    : {};
}

async function loadServersForKey(
  client: ClientMeta,
  effectiveKey: string,
): Promise<Record<string, unknown>> {
  if (!client.configPath) return {};
  try {
    const content = await invoke<string>("get_client_config", { configPath: client.configPath });
    if (client.configFormat === "toml") {
      const jsonStr = await invoke<string>("parse_toml_servers", {
        content,
        configKey: client.configKey,
      });
      return JSON.parse(jsonStr);
    }
    const parsed = JSON.parse(content);
    return navigateKey(parsed, effectiveKey);
  } catch {
    return {};
  }
}

function serverSummary(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (d.command) {
    const args = Array.isArray(d.args) ? ` ${(d.args as string[]).join(" ")}` : "";
    return `${d.command}${args}`;
  }
  if (d.url) return String(d.url);
  return "";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onImported?: () => void; // called after servers are added so caller can auto-save
}

function ImportDialog({ onClose, onImported }: Props) {
  const { selectedClientId, addServer } = useConfigStore();
  const detectedClients = useClientStore((s) => s.clients);
  const [source, setSource] = useState<"file" | "client">("client");
  const [clientId, setClientId] = useState("");
  const [importScope, setImportScope] = useState("user");
  const [projectScopes, setProjectScopes] = useState<ProjectScope[]>([]);
  const [homeDir, setHomeDir] = useState("");
  const [available, setAvailable] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);

  const targets = getConfigurableClients().filter((c) => c.id !== selectedClientId);
  const selectedClientMeta = targets.find((c) => c.id === clientId) ?? null;
  const isScoped = !!selectedClientMeta?.supportsScopes;

  // Resolve home dir once on mount
  useEffect(() => {
    invoke<string>("get_home_dir").then(setHomeDir).catch(() => {});
  }, []);

  // When client changes, reset scope and load project scopes if needed
  useEffect(() => {
    if (!clientId || source !== "client") return;
    setImportScope("user");
    setAvailable({});
    setSelected(new Set());
    setProjectScopes([]);
    if (selectedClientMeta?.supportsScopes && selectedClientMeta.configPath) {
      invoke<ProjectScope[]>("list_claude_code_scopes", {
        configPath: selectedClientMeta.configPath,
      })
        .then(setProjectScopes)
        .catch(() => {});
    }
  }, [clientId, source]);

  // Load servers whenever client or scope changes
  useEffect(() => {
    if (source !== "client" || !clientId || !homeDir) return;
    const client = targets.find((c) => c.id === clientId);
    if (!client) return;

    const effectiveKey = buildEffectiveKey(client, importScope, homeDir);
    setLoading(true);
    setLoadError(null);
    loadServersForKey(client, effectiveKey)
      .then((servers) => {
        setAvailable(servers);
        setSelected(new Set(Object.keys(servers)));
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [source, clientId, importScope, homeDir]);

  async function handlePickFile() {
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await invoke<string | null>("import_tsr");
      if (!raw) { setLoading(false); return; }
      const servers = parseTsrContent(raw);
      setAvailable(servers);
      setSelected(new Set(Object.keys(servers)));
      setFileLoaded(true);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetSource(s: "file" | "client") {
    setSource(s);
    setAvailable({});
    setSelected(new Set());
    setFileLoaded(false);
    setLoadError(null);
    setClientId("");
    setImportScope("user");
    setProjectScopes([]);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(Object.keys(available)) : new Set());
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleImport() {
    for (const name of selected) {
      if (available[name] !== undefined) {
        addServer(name, available[name] as Record<string, unknown>);
      }
    }
    onImported?.();
    onClose();
  }

  const serverEntries = Object.entries(available);
  const allChecked = serverEntries.length > 0 && selected.size === serverEntries.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-lg w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Import MCP Servers</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text rounded p-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Source selector */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-medium text-text-muted mb-2">Import from</p>
          <div className="flex gap-2">
            {(["client", "file"] as const).map((s) => (
              <button
                key={s}
                onClick={() => resetSource(s)}
                className={`flex-1 py-2 text-xs rounded-md border transition-colors ${source === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-surface-hover"}`}
              >
                {s === "file" ? ".tsr File" : "Another Client"}
              </button>
            ))}
          </div>
        </div>

        {/* Source controls */}
        <div className="px-5 pb-3 space-y-2">
          {source === "file" ? (
            <>
              <button
                onClick={handlePickFile}
                disabled={loading}
                className="w-full py-2 text-xs border border-dashed border-border rounded-md text-text-muted hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : fileLoaded ? "Choose a different file…" : "Choose .tsr or .json file…"}
              </button>
              <p className="text-[11px] text-text-muted/60 text-center">
                Import a previously exported mTarsier config file (.tsr or .json)
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="appearance-none w-full pl-2.5 pr-8 py-1.5 text-xs bg-surface border border-border rounded-md text-text focus:outline-none focus:border-primary/60 cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <option value="">Pick a client…</option>
                  {targets.map((c) => {
                    const count = detectedClients.find((d) => d.meta.id === c.id)?.serverCount;
                    const label = count != null ? `${c.name}  (${count} server${count !== 1 ? "s" : ""})` : c.name;
                    return <option key={c.id} value={c.id}>{label}</option>;
                  })}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Scope picker — only for Claude Code */}
              {isScoped && clientId && (
                <div className="relative">
                  <select
                    value={importScope}
                    onChange={(e) => setImportScope(e.target.value)}
                    className="appearance-none w-full pl-2.5 pr-8 py-1.5 text-xs bg-surface border border-border rounded-md text-text focus:outline-none focus:border-primary/60 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <optgroup label="~/.claude.json">
                      <option value="user">Global (--scope user)</option>
                      <option value="local">Local / home dir</option>
                    </optgroup>
                    {projectScopes.length > 0 && (
                      <optgroup label="Per-project">
                        {projectScopes.map((p) => {
                          const label = p.path.replace(/^\/Users\/[^/]+\//, "~/");
                          return (
                            <option key={p.path} value={p.path}>
                              {label} ({p.server_count})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </>
          )}

          {loadError && <p className="text-xs text-red-400">{loadError}</p>}

          {source === "client" && clientId && !loading && serverEntries.length === 0 && !loadError && (
            <p className="text-xs text-text-muted text-center py-1">No servers in this scope</p>
          )}
        </div>

        {/* Server checklist */}
        {serverEntries.length > 0 && (
          <div className="flex flex-col min-h-0 flex-1 border-t border-border">
            <div className="flex items-center px-5 py-2.5 border-b border-border">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-xs text-text-muted">
                  {selected.size} of {serverEntries.length} selected
                </span>
              </label>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {serverEntries.map(([name, data]) => {
                const summary = serverSummary(data);
                return (
                  <label
                    key={name}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${selected.has(name) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-hover"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(name)}
                      onChange={() => toggle(name)}
                      className="mt-0.5 accent-primary flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium text-text truncate">{name}</p>
                      {summary && (
                        <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">{summary}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="px-3.5 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {selected.size > 0 ? `${selected.size} server${selected.size !== 1 ? "s" : ""}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportDialog;
