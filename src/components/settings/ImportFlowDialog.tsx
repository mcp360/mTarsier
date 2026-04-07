import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useClientStore } from "../../store/clientStore";
import { CLIENT_REGISTRY, getConfigurableClients } from "../../lib/clients";
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

interface FlowImportResult {
  imported_servers: number;
  imported_skills: number;
  skipped_clients: string[];
  skipped_servers: string[];
  errors: string[];
}

interface McpServerEntry { name: string }
interface Props { onClose: () => void }

type ImportTab = "mcp" | "skills";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serverSummary(s: FlowServer): string {
  if (s.command) return `${s.command}${s.args?.length ? ` ${s.args.join(" ")}` : ""}`;
  if (s.url) return s.url;
  return "";
}

function ClientDropdown({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string; installed: boolean }>;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full pl-2.5 pr-7 py-1.5 text-xs bg-base border border-border rounded-md text-text
          focus:outline-none focus:border-primary/60 cursor-pointer hover:border-primary/40 transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportFlowDialog({ onClose }: Props) {
  const detectedClients = useClientStore((s) => s.clients);
  const mcpTargetOptions = getConfigurableClients();
  const skillTargetOptions = CLIENT_REGISTRY.filter((c) => c.supportsSkills && c.configPath);

  const [tab, setTab] = useState<ImportTab>("mcp");
  const [flowData, setFlowData] = useState<FlowExport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-source-client target maps: sourceClientId -> targetClientId
  const [mcpTargetMap, setMcpTargetMap] = useState<Record<string, string>>({});
  const [skillTargetMap, setSkillTargetMap] = useState<Record<string, string>>({});

  // Per-source-client existing server names (for conflict detection): sourceClientId -> Set<name>
  const [existingNamesMap, setExistingNamesMap] = useState<Record<string, Set<string>>>({});

  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<FlowImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const clientsWithServers = flowData?.clients.filter((c) => c.servers.length > 0) ?? [];
  const clientsWithSkills = flowData?.clients.filter((c) => c.skills.length > 0) ?? [];
  const allServers = clientsWithServers.flatMap((c) => c.servers);
  const allSkills = clientsWithSkills.flatMap((c) => c.skills);

  // Build dropdown options lists with install status
  const buildMcpOptions = () => mcpTargetOptions.map((c) => {
    const det = detectedClients.find((d) => d.meta.id === c.id);
    const count = det?.serverCount;
    const installed = !!det?.installed;
    const label = installed
      ? `${c.name}${count != null ? `  (${count} server${count !== 1 ? "s" : ""})` : ""}`
      : `${c.name}  (not installed)`;
    return { id: c.id, label, installed };
  });

  const buildSkillOptions = () => skillTargetOptions.map((c) => {
    const det = detectedClients.find((d) => d.meta.id === c.id);
    const installed = !!det?.installed;
    return { id: c.id, label: installed ? c.name : `${c.name}  (not installed)`, installed };
  });

  async function handlePickFile() {
    setLoadError(null);
    setFlowData(null);
    setImportResult(null);
    setImportError(null);
    setMcpTargetMap({});
    setSkillTargetMap({});
    setExistingNamesMap({});
    try {
      const raw = await invoke<string | null>("import_tsr");
      if (!raw) return;
      const parsed = JSON.parse(raw) as FlowExport;
      if (!parsed.version || !Array.isArray(parsed.clients)) {
        setLoadError("Invalid flow file — missing version or clients array.");
        return;
      }
      setFlowData(parsed);
      setSelectedServers(new Set(parsed.clients.flatMap((c) => c.servers.map((s) => s.name))));
      setSelectedSkills(new Set(parsed.clients.flatMap((c) => c.skills.map((s) => s.name))));

      // Auto-select same client as target if installed, otherwise leave empty
      const initialMcpMap: Record<string, string> = {};
      const initialSkillMap: Record<string, string> = {};
      for (const fc of parsed.clients) {
        const det = detectedClients.find((d) => d.meta.id === fc.id);
        if (det?.installed) {
          if (fc.servers.length > 0 && mcpTargetOptions.find((c) => c.id === fc.id)) {
            initialMcpMap[fc.id] = fc.id;
          }
          if (fc.skills.length > 0 && skillTargetOptions.find((c) => c.id === fc.id)) {
            initialSkillMap[fc.id] = fc.id;
          }
        }
      }
      setMcpTargetMap(initialMcpMap);
      setSkillTargetMap(initialSkillMap);
    } catch (e) {
      setLoadError(String(e));
    }
  }

  // Load existing servers for each source client when its MCP target changes
  async function handleMcpTargetChange(sourceClientId: string, targetClientId: string) {
    setMcpTargetMap((prev) => ({ ...prev, [sourceClientId]: targetClientId }));
    if (!targetClientId) {
      setExistingNamesMap((prev) => { const n = { ...prev }; delete n[sourceClientId]; return n; });
      return;
    }
    const meta = mcpTargetOptions.find((c) => c.id === targetClientId);
    if (!meta?.configPath || !meta.configKey) return;
    try {
      const entries = await invoke<McpServerEntry[]>("read_mcp_servers", {
        configPath: meta.configPath,
        configKey: meta.configKey,
        configFormat: meta.configFormat,
      });
      setExistingNamesMap((prev) => ({ ...prev, [sourceClientId]: new Set(entries.map((e) => e.name)) }));
    } catch {
      setExistingNamesMap((prev) => ({ ...prev, [sourceClientId]: new Set() }));
    }
  }

  // Load existing servers for auto-selected targets on file load
  useEffect(() => {
    for (const [sourceId, targetId] of Object.entries(mcpTargetMap)) {
      if (!existingNamesMap[sourceId] && targetId) {
        handleMcpTargetChange(sourceId, targetId);
      }
    }
  }, [mcpTargetMap]);

  function toggleServer(name: string) {
    setSelectedServers((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  function toggleSkill(name: string) {
    setSelectedSkills((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }

  async function handleImport() {
    if (!flowData) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      let totalServers = 0, totalSkills = 0;
      const skippedServers: string[] = [], errors: string[] = [];

      // Group selected servers by their chosen target client
      const serversByTarget: Record<string, FlowClient[]> = {};
      for (const fc of clientsWithServers) {
        const targetId = mcpTargetMap[fc.id];
        if (!targetId) continue;
        const servers = fc.servers.filter((s) => selectedServers.has(s.name));
        if (servers.length === 0) continue;
        if (!serversByTarget[targetId]) serversByTarget[targetId] = [];
        serversByTarget[targetId].push({ ...fc, servers, skills: [] });
      }

      // Group selected skills by their chosen target client
      const skillsByTarget: Record<string, FlowClient[]> = {};
      for (const fc of clientsWithSkills) {
        const targetId = skillTargetMap[fc.id];
        if (!targetId) continue;
        const skills = fc.skills.filter((s) => selectedSkills.has(s.name));
        if (skills.length === 0) continue;
        if (!skillsByTarget[targetId]) skillsByTarget[targetId] = [];
        skillsByTarget[targetId].push({ ...fc, servers: [], skills });
      }

      // Collect all unique target client IDs
      const allTargets = new Set([...Object.keys(serversByTarget), ...Object.keys(skillsByTarget)]);

      for (const targetId of allTargets) {
        const serverClients = serversByTarget[targetId] ?? [];
        const skillClients = skillsByTarget[targetId] ?? [];

        // Merge into a combined client list for this target
        const mergedClients: FlowClient[] = [];
        const seenIds = new Set<string>();
        for (const fc of [...serverClients, ...skillClients]) {
          if (seenIds.has(fc.id)) {
            const existing = mergedClients.find((c) => c.id === fc.id)!;
            existing.servers.push(...fc.servers);
            existing.skills.push(...fc.skills);
          } else {
            mergedClients.push({ ...fc, servers: [...fc.servers], skills: [...fc.skills] });
            seenIds.add(fc.id);
          }
        }

        const r = await invoke<FlowImportResult>("import_flow", {
          content: JSON.stringify({ ...flowData, clients: mergedClients }),
          targetClientId: targetId,
          installSkills: skillClients.length > 0,
        });
        totalServers += r.imported_servers;
        totalSkills += r.imported_skills;
        skippedServers.push(...r.skipped_servers);
        errors.push(...r.errors);
      }

      setImportResult({
        imported_servers: totalServers,
        imported_skills: totalSkills,
        skipped_clients: [],
        skipped_servers: [...new Set(skippedServers)],
        errors,
      });
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  }

  // Can import if at least one source group has a target and selected items
  const hasMcpToImport = clientsWithServers.some(
    (fc) => mcpTargetMap[fc.id] && fc.servers.some((s) => selectedServers.has(s.name))
  );
  const hasSkillsToImport = clientsWithSkills.some(
    (fc) => skillTargetMap[fc.id] && fc.skills.some((s) => selectedSkills.has(s.name))
  );
  const canImport = hasMcpToImport || hasSkillsToImport;

  const mcpOptions = buildMcpOptions();
  const skillOptions = buildSkillOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold">Import Flow</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text rounded p-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* File picker */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <button
            onClick={handlePickFile}
            className="w-full py-2 text-xs border border-dashed border-border rounded-md text-text-muted
              hover:border-primary/30 hover:text-primary transition-colors"
          >
            {flowData ? "Choose a different file…" : "Choose flow file (.json / .tsr)…"}
          </button>
          {loadError && <p className="text-xs text-red-400 mt-2">{loadError}</p>}
        </div>

        {/* Tabs + content */}
        {flowData && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-5 border-b border-border flex-shrink-0">
              {(["mcp", "skills"] as ImportTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "text-xs px-3 py-2 border-b-2 -mb-px transition-colors",
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

            {/* Select all bar */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-border flex-shrink-0">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                {tab === "mcp" ? "MCP Servers" : "Skills"}
              </span>
              <button
                onClick={() => {
                  if (tab === "mcp") {
                    setSelectedServers(
                      selectedServers.size === allServers.length
                        ? new Set()
                        : new Set(allServers.map((s) => s.name))
                    );
                  } else {
                    setSelectedSkills(
                      selectedSkills.size === allSkills.length
                        ? new Set()
                        : new Set(allSkills.map((s) => s.name))
                    );
                  }
                }}
                className="text-[10px] text-primary hover:text-primary/70 transition-colors"
              >
                {tab === "mcp"
                  ? (selectedServers.size === allServers.length ? "Deselect all" : "Select all")
                  : (selectedSkills.size === allSkills.length ? "Deselect all" : "Select all")
                }
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">

              {/* ── MCP tab ── */}
              {tab === "mcp" && (
                allServers.length === 0
                  ? <p className="text-xs text-text-muted text-center py-10">No MCP servers in this flow file.</p>
                  : clientsWithServers.map((fc) => {
                    const existing = existingNamesMap[fc.id] ?? new Set<string>();
                    const isSourceInstalled = !!detectedClients.find((d) => d.meta.id === fc.id)?.installed;
                    return (
                      <div key={fc.id} className="border-b border-border last:border-b-0">
                        {/* Source client header + its own target dropdown */}
                        <div className="px-5 pt-3 pb-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                              From {fc.name}
                            </p>
                            {!isSourceInstalled && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                                not installed
                              </span>
                            )}
                          </div>
                          {mcpTargetMap[fc.id] !== undefined || true ? (
                            <ClientDropdown
                              value={mcpTargetMap[fc.id] ?? ""}
                              onChange={(v) => handleMcpTargetChange(fc.id, v)}
                              options={mcpOptions}
                              placeholder="Import into…"
                            />
                          ) : null}
                        </div>

                        {/* Servers list */}
                        <div className="px-4 pb-3 space-y-1.5">
                          {fc.servers.map((s) => {
                            const conflict = existing.has(s.name);
                            const summary = serverSummary(s);
                            return (
                              <label
                                key={s.name}
                                className={cn(
                                  "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                                  selectedServers.has(s.name) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-hover"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedServers.has(s.name)}
                                  onChange={() => toggleServer(s.name)}
                                  className="mt-0.5 accent-primary flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-mono font-medium text-text truncate">{s.name}</p>
                                    {conflict && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 bg-amber-500/20 text-amber-400">
                                        already exists
                                      </span>
                                    )}
                                  </div>
                                  {summary && (
                                    <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">{summary}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}

              {/* ── Skills tab ── */}
              {tab === "skills" && (
                allSkills.length === 0
                  ? <p className="text-xs text-text-muted text-center py-10">No skills in this flow file.</p>
                  : clientsWithSkills.map((fc) => {
                    const isSourceInstalled = !!detectedClients.find((d) => d.meta.id === fc.id)?.installed;
                    return (
                      <div key={fc.id} className="border-b border-border last:border-b-0">
                        {/* Source client header + its own target dropdown */}
                        <div className="px-5 pt-3 pb-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                              From {fc.name}
                            </p>
                            {!isSourceInstalled && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                                not installed
                              </span>
                            )}
                          </div>
                          <ClientDropdown
                            value={skillTargetMap[fc.id] ?? ""}
                            onChange={(v) => setSkillTargetMap((prev) => ({ ...prev, [fc.id]: v }))}
                            options={skillOptions}
                            placeholder="Install into…"
                          />
                        </div>

                        {/* Skills list */}
                        <div className="px-4 pb-3 space-y-1.5">
                          {fc.skills.map((s) => (
                            <label
                              key={s.name}
                              className={cn(
                                "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                                selectedSkills.has(s.name) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-surface-hover"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedSkills.has(s.name)}
                                onChange={() => toggleSkill(s.name)}
                                className="mt-0.5 accent-primary flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-mono font-medium text-text truncate">{s.name}</p>
                                {s.description && (
                                  <p className="text-[11px] text-text-muted truncate mt-0.5">{s.description}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}

        {/* Import result */}
        {importResult && (
          <div className="px-5 py-3 border-t border-border flex-shrink-0">
            <div className="rounded border border-primary/20 bg-primary/5 p-3 space-y-1">
              <p className="text-xs text-primary font-medium">Import complete</p>
              <p className="text-xs text-text-muted">
                {importResult.imported_servers} server(s) and {importResult.imported_skills} skill(s) imported
              </p>
              {importResult.skipped_servers.length > 0 && (
                <p className="text-xs text-text-muted">
                  Skipped (already exist): {importResult.skipped_servers.join(", ")}
                </p>
              )}
              {importResult.errors.length > 0 && (
                <p className="text-xs text-red-400">{importResult.errors.join("; ")}</p>
              )}
            </div>
          </div>
        )}

        {importError && (
          <div className="px-5 py-2 flex-shrink-0">
            <p className="text-xs text-red-400">{importError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
          >
            {importResult ? "Close" : "Cancel"}
          </button>
          {!importResult && (
            <button
              onClick={handleImport}
              disabled={importing || !canImport}
              className="px-3.5 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
