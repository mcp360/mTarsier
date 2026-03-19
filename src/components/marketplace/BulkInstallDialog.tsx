import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { extractServersFromJson } from "../../lib/mcpUtils";
import { useClientStore } from "../../store/clientStore";
import { getClientById } from "../../lib/clients";
import type { MarketplaceServer } from "../../data/marketplace";

interface ActionResult {
  serverId: string;
  serverName: string;
  clientId: string;
  clientName: string;
  success: boolean;
  error?: string;
}

interface Props {
  servers: MarketplaceServer[];
  onClose: () => void;
  onSuccess: (summary: string) => void;
}

function BulkInstallDialog({ servers, onClose, onSuccess }: Props) {
  const { clients } = useClientStore();

  const availableClients = clients.filter(
    (cs) => cs.meta.configPath !== null && cs.installed
  );

  // Servers that can be auto-installed (no required config fields)
  const autoInstallable = servers.filter(
    (s) =>
      !s.apiKeys?.some((k) => k.required) &&
      !s.params?.some((p) => p.required)
  );
  const needsConfig = servers.filter(
    (s) =>
      s.apiKeys?.some((k) => k.required) || s.params?.some((p) => p.required)
  );

  const [mode, setMode] = useState<"install" | "remove">("install");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    () => new Set(availableClients[0]?.meta.id ? [availableClients[0].meta.id] : [])
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ActionResult[] | null>(null);

  const switchMode = (m: "install" | "remove") => {
    setMode(m);
    setResults(null);
  };

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInstall = async () => {
    if (selectedClientIds.size === 0 || autoInstallable.length === 0) return;

    setIsProcessing(true);
    const collected: ActionResult[] = [];

    for (const clientId of selectedClientIds) {
      const client = getClientById(clientId);
      if (!client || !client.configPath) continue;

      // Backup once per client before writing any servers
      try { await invoke("create_backup", { configPath: client.configPath, clientId: client.id }); } catch {}

      const configKey = client.supportsScopes ? "mcpServers" : client.configKey;

      // Read existing config once, merge all servers, write once
      let existingServers: Record<string, unknown> = {};
      try {
        const content = await invoke<string>("get_client_config", { configPath: client.configPath });
        if (client.configFormat === "toml") {
          const jsonStr = await invoke<string>("parse_toml_servers", { content, configKey: client.configKey });
          existingServers = JSON.parse(jsonStr);
        } else {
          existingServers = extractServersFromJson(content, configKey);
        }
      } catch {
        // Config doesn't exist yet — start fresh
      }

      const mergedServers = { ...existingServers };
      for (const server of autoInstallable) {
        const supportsNativeRemote = client.supportedTransports.some(
          (t) => t === "streamable-http" || t === "sse"
        );
        if (server.remoteUrl && supportsNativeRemote) {
          mergedServers[server.id] = { url: server.remoteUrl };
        } else {
          mergedServers[server.id] = { command: server.command, args: server.args };
        }
      }

      try {
        await invoke("write_client_config", {
          request: {
            config_path: client.configPath,
            config_key: configKey,
            config_format: client.configFormat,
            servers: mergedServers,
          },
        });
        for (const server of autoInstallable) {
          collected.push({ serverId: server.id, serverName: server.name, clientId, clientName: client.name, success: true });
        }
      } catch (err) {
        for (const server of autoInstallable) {
          collected.push({ serverId: server.id, serverName: server.name, clientId, clientName: client.name, success: false, error: String(err) });
        }
      }
    }

    setResults(collected);
    setIsProcessing(false);

    const successCount = collected.filter((r) => r.success).length;
    const total = autoInstallable.length * selectedClientIds.size;
    if (successCount > 0) {
      onSuccess(`${successCount} of ${total} servers installed`);
    }
  };

  const handleRemove = async () => {
    if (selectedClientIds.size === 0 || servers.length === 0) return;

    setIsProcessing(true);

    // Resolve home dir for scoped clients (Claude Code uses {HOME} in configKey)
    let homeDir = "";
    if ([...selectedClientIds].some((id) => getClientById(id)?.supportsScopes)) {
      try {
        homeDir = await invoke<string>("get_home_dir");
      } catch {
        // fall through
      }
    }

    const collected: ActionResult[] = [];

    for (const clientId of selectedClientIds) {
      const client = getClientById(clientId);
      if (!client || !client.configPath) continue;

      // Backup once per client before any writes
      try { await invoke("create_backup", { configPath: client.configPath, clientId: client.id }); } catch {}

      const resolvedConfigKey = client.configKey.replace("{HOME}", homeDir);
      const scopesToCheck = client.supportsScopes
        ? ["mcpServers", resolvedConfigKey]
        : [resolvedConfigKey];

      // Read config once per client, then remove all servers in a single pass per scope
      let content = "";
      try {
        content = await invoke<string>("get_client_config", { configPath: client.configPath });
      } catch (err) {
        for (const server of servers) {
          collected.push({ serverId: server.id, serverName: server.name, clientId, clientName: client.name, success: false, error: String(err) });
        }
        continue;
      }

      // For each scope, find which servers live there and batch-remove them
      for (const configKey of scopesToCheck) {
        let existing: Record<string, unknown>;
        if (client.configFormat === "toml") {
          try {
            const jsonStr = await invoke<string>("parse_toml_servers", { content, configKey: client.configKey });
            existing = JSON.parse(jsonStr);
          } catch {
            existing = {};
          }
        } else {
          existing = extractServersFromJson(content, configKey);
        }

        const toRemove = servers.filter((s) => s.id in existing);
        if (toRemove.length === 0) continue;

        const remaining = { ...existing };
        for (const s of toRemove) delete remaining[s.id];

        try {
          await invoke("write_client_config", {
            request: {
              config_path: client.configPath,
              config_key: configKey,
              config_format: client.configFormat,
              servers: remaining,
            },
          });
          for (const s of toRemove) {
            collected.push({ serverId: s.id, serverName: s.name, clientId, clientName: client.name, success: true });
          }
        } catch (err) {
          for (const s of toRemove) {
            collected.push({ serverId: s.id, serverName: s.name, clientId, clientName: client.name, success: false, error: String(err) });
          }
        }
      }

      // Any servers not found in any scope
      const handledIds = new Set(collected.filter((r) => r.clientId === clientId).map((r) => r.serverId));
      for (const server of servers) {
        if (!handledIds.has(server.id)) {
          collected.push({ serverId: server.id, serverName: server.name, clientId, clientName: client.name, success: false, error: "Not found in config" });
        }
      }
    }

    setResults(collected);
    setIsProcessing(false);

    const successCount = collected.filter((r) => r.success).length;
    const total = servers.length * selectedClientIds.size;
    if (successCount > 0) {
      onSuccess(`${successCount} of ${total} servers removed`);
    }
  };

  const isDone = results !== null;
  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  // Per-server result summary for display
  const serverResultMap = new Map<string, { ok: number; fail: number }>();
  if (results) {
    for (const r of results) {
      const cur = serverResultMap.get(r.serverId) ?? { ok: 0, fail: 0 };
      if (r.success) cur.ok++;
      else cur.fail++;
      serverResultMap.set(r.serverId, cur);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={isDone ? onClose : undefined} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-sm font-semibold">
            {mode === "remove" ? "Remove" : "Install"} {servers.length} server{servers.length !== 1 ? "s" : ""}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">Select clients to {mode} {mode === "remove" ? "from" : "to"}</p>
        </div>

        {/* Mode toggle */}
        {!isDone && (
          <div className="flex rounded-md border border-border overflow-hidden text-xs mb-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => switchMode("install")}
              disabled={isProcessing}
              className={cn(
                "flex-1 py-1.5 font-medium transition-colors",
                mode === "install"
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay"
              )}
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => switchMode("remove")}
              disabled={isProcessing}
              className={cn(
                "flex-1 py-1.5 font-medium transition-colors border-l border-border",
                mode === "remove"
                  ? "bg-rose-400/10 text-rose-400"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay"
              )}
            >
              Remove
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Servers list */}
          <div>
            {mode === "install" ? (
              <>
                {autoInstallable.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] font-medium text-text-muted mb-1.5">
                      Will install ({autoInstallable.length})
                    </p>
                    <div className="space-y-1">
                      {autoInstallable.map((s) => {
                        const sr = serverResultMap.get(s.id);
                        return (
                          <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-base rounded-md border border-border text-[11px]">
                            <span className="font-medium text-text flex-1 min-w-0 truncate">{s.name}</span>
                            {sr && sr.ok > 0 && sr.fail === 0 && (
                              <span className="text-primary flex items-center gap-1 flex-shrink-0">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                done
                              </span>
                            )}
                            {sr && sr.fail > 0 && (
                              <span className="text-rose-400 flex items-center gap-1 flex-shrink-0">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {sr.ok > 0 ? "partial" : "failed"}
                              </span>
                            )}
                            {isProcessing && !sr && (
                              <span className="text-text-muted/50 text-[10px] flex-shrink-0">pending…</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {needsConfig.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-text-muted mb-1.5">
                      Needs individual setup ({needsConfig.length})
                    </p>
                    <div className="space-y-1">
                      {needsConfig.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-base rounded-md border border-border/50 text-[11px] opacity-60">
                          <span className="font-medium text-text flex-1 min-w-0 truncate">{s.name}</span>
                          <span className="text-amber text-[10px] flex-shrink-0">⚠ requires config</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted/60 mt-1.5">
                      Install these individually using the Install button on each card.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Remove mode — all servers are actionable */
              <div className="mb-2">
                <p className="text-[11px] font-medium text-text-muted mb-1.5">
                  Will remove ({servers.length})
                </p>
                <div className="space-y-1">
                  {servers.map((s) => {
                    const sr = serverResultMap.get(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-base rounded-md border border-border text-[11px]">
                        <span className="font-medium text-text flex-1 min-w-0 truncate">{s.name}</span>
                        {sr && sr.ok > 0 && sr.fail === 0 && (
                          <span className="text-primary flex items-center gap-1 flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            removed
                          </span>
                        )}
                        {sr && sr.fail > 0 && (
                          <span className="text-rose-400 flex items-center gap-1 flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {sr.ok > 0 ? "partial" : "failed"}
                          </span>
                        )}
                        {isProcessing && !sr && (
                          <span className="text-text-muted/50 text-[10px] flex-shrink-0">pending…</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Client selection */}
          {!isDone && (
            <div>
              <p className="text-[11px] font-medium text-text-muted mb-1.5">
                {mode === "remove" ? "Remove from:" : "Install to:"}
              </p>
              {availableClients.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4 bg-base rounded-md border border-border">
                  No installed clients found.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {availableClients.map((cs) => {
                    const isSelected = selectedClientIds.has(cs.meta.id);
                    return (
                      <button
                        key={cs.meta.id}
                        type="button"
                        onClick={() => toggleClient(cs.meta.id)}
                        disabled={isProcessing}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs rounded-md border transition-colors",
                          isSelected
                            ? mode === "remove"
                              ? "border-rose-400/50 bg-rose-400/5 text-text"
                              : "border-primary/50 bg-primary/5 text-text"
                            : "border-border hover:border-border-hover text-text-muted hover:text-text",
                          isProcessing && "cursor-default opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                              isSelected
                                ? mode === "remove"
                                  ? "border-rose-400 bg-rose-400"
                                  : "border-primary bg-primary"
                                : "border-text-muted/40"
                            )}
                          >
                            {isSelected && (
                              <svg className="w-2 h-2 text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-[11px]">{cs.meta.name}</span>
                          <span className="text-[10px] text-text-muted ml-auto">
                            {cs.meta.configFormat.toUpperCase()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Results summary */}
          {isDone && (
            <div className={cn(
              "px-3 py-2.5 rounded-md border text-xs",
              failCount === 0
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-amber/5 border-amber/20 text-amber"
            )}>
              {failCount === 0
                ? `✓ All ${successCount} ${mode === "remove" ? "removal" : "installation"}${successCount !== 1 ? "s" : ""} succeeded`
                : `${successCount} succeeded, ${failCount} failed`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 flex-shrink-0 border-t border-border mt-4">
          {isDone ? (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              {mode === "install" ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={
                    selectedClientIds.size === 0 ||
                    autoInstallable.length === 0 ||
                    isProcessing ||
                    availableClients.length === 0
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing
                    ? "Installing..."
                    : `Install ${autoInstallable.length} server${autoInstallable.length !== 1 ? "s" : ""}${selectedClientIds.size > 1 ? ` to ${selectedClientIds.size} clients` : ""}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={
                    selectedClientIds.size === 0 ||
                    servers.length === 0 ||
                    isProcessing ||
                    availableClients.length === 0
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing
                    ? "Removing..."
                    : `Remove ${servers.length} server${servers.length !== 1 ? "s" : ""}${selectedClientIds.size > 1 ? ` from ${selectedClientIds.size} clients` : ""}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkInstallDialog;
