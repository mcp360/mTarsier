import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { useDeepLinkStore } from "../../store/deepLinkStore";
import { useClientStore } from "../../store/clientStore";
import { getClientById } from "../../lib/clients";
import { extractServersFromJson } from "../../lib/mcpUtils";
import { MARKETPLACE_SERVERS } from "../../data/marketplace";
import { useNavigate } from "react-router-dom";
import { Server, Check, X as XIcon } from "lucide-react";

/**
 * Global handler that watches useDeepLinkStore.pending.
 *
 * - Marketplace MCP (server exists)  → direct install dialog
 * - Unknown/custom MCP              → fallback to marketplace page
 * - Skill                           → navigate to skills page
 * - Navigation                      → navigate to page
 */
export default function DeepLinkHandler() {
  const pending = useDeepLinkStore((s) => s.pending);
  const clear = useDeepLinkStore((s) => s.clear);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pending) return;

    if (pending.type === "navigate") {
      navigate(pending.path);
      clear();
    } else if (pending.type === "install-mcp-custom") {
      navigate("/marketplace");
      clear();
    } else if (pending.type === "install-skill") {
      navigate("/skills");
      clear();
    } else if (pending.type === "install-mcp") {
      const server = MARKETPLACE_SERVERS.find((s) => s.id === pending.serverId);
      if (!server) {
        navigate("/marketplace");
        clear();
      }
    }
  }, [pending, navigate, clear]);

  // Marketplace MCP — server exists, show install dialog
  if (pending?.type === "install-mcp") {
    const server = MARKETPLACE_SERVERS.find((s) => s.id === pending.serverId);
    if (!server) return null;

    return (
      <McpInstallDialog
        name={server.id}
        displayName={server.name}
        description={server.description}
        publisher={server.publisher}
        command={server.command}
        args={server.args}
        remoteUrl={server.remoteUrl}
        onClose={clear}
      />
    );
  }

  return null;
}

/* ─── MCP Install Dialog ────────────────────────────────────────────────── */

interface McpInstallProps {
  name: string;
  displayName: string;
  description: string;
  publisher: string;
  command: string;
  args: string[];
  remoteUrl?: string;
  onClose: () => void;
}

function McpInstallDialog({ name, displayName, description, publisher, command, args, remoteUrl, onClose }: McpInstallProps) {
  const { clients } = useClientStore();

  const availableClients = clients.filter(
    (cs) => cs.meta.configPath !== null && cs.installed
  );

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(() => {
    const ids = availableClients.map((cs) => cs.meta.id);
    return new Set(ids.length > 0 ? [ids[0]] : []);
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string; success: boolean; error?: string }[]>([]);

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInstall = async () => {
    if (selectedClientIds.size === 0) return;
    setIsInstalling(true);
    setResults([]);

    const installResults: typeof results = [];

    for (const clientId of selectedClientIds) {
      const client = getClientById(clientId);
      if (!client || !client.configPath) continue;

      try {
        const supportsNativeRemote = client.supportedTransports.some(
          (t) => t === "streamable-http" || t === "sse"
        );

        let serverData: Record<string, unknown>;

        if (remoteUrl && supportsNativeRemote) {
          serverData = { url: remoteUrl };
        } else {
          serverData = { command, args };
        }

        const configKey = client.supportsScopes ? "mcpServers" : client.configKey;

        let existingServers: Record<string, unknown> = {};
        try {
          const content = await invoke<string>("get_client_config", {
            configPath: client.configPath,
          });
          if (client.configFormat === "toml") {
            const jsonStr = await invoke<string>("parse_toml_servers", {
              content,
              configKey: client.configKey,
            });
            existingServers = JSON.parse(jsonStr);
          } else {
            existingServers = extractServersFromJson(content, configKey);
          }
        } catch {
          // Config doesn't exist yet
        }

        const merged = { ...existingServers, [name]: serverData };

        try { await invoke("create_backup", { configPath: client.configPath, clientId: client.id }); } catch {}

        await invoke("write_client_config", {
          request: {
            config_path: client.configPath,
            config_key: configKey,
            config_format: client.configFormat,
            servers: merged,
          },
        });

        installResults.push({ id: clientId, name: client.name, success: true });
      } catch (err) {
        installResults.push({ id: clientId, name: client.name, success: false, error: String(err) });
      }
    }

    setResults(installResults);
    setIsInstalling(false);
  };

  const done = results.length > 0;
  const succeeded = results.filter((r) => r.success).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={done ? onClose : undefined} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Server size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text">Install {displayName}</h3>
            <p className="text-xs text-text-muted mt-0.5">by {publisher}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <XIcon size={14} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted mb-4 leading-relaxed">{description}</p>

        {/* Client selection */}
        {availableClients.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4 bg-base rounded-md border border-border">
            No installed clients detected.
          </p>
        ) : (
          <div className="space-y-1.5 mb-4">
            <p className="text-[11px] text-text-muted font-medium">Select clients</p>
            {availableClients.map((cs) => {
              const isSelected = selectedClientIds.has(cs.meta.id);
              const result = results.find((r) => r.id === cs.meta.id);
              return (
                <button
                  key={cs.meta.id}
                  type="button"
                  onClick={() => toggleClient(cs.meta.id)}
                  disabled={isInstalling || done}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-xs rounded-md border transition-colors",
                    isSelected
                      ? "border-primary/50 bg-primary/5 text-text"
                      : "border-border hover:border-border-hover text-text-muted hover:text-text",
                    (isInstalling || done) && "cursor-default"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-text-muted/40"
                      )}
                    >
                      {isSelected && (
                        <svg className="w-2 h-2 text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-[11px]">{cs.meta.name}</span>
                    {result && (
                      <span className={cn("flex items-center gap-1 text-[10px] ml-auto", result.success ? "text-primary" : "text-rose-400")}>
                        {result.success ? <Check size={10} /> : <XIcon size={10} />}
                        {result.success ? "done" : "failed"}
                      </span>
                    )}
                    {!result && (
                      <span className="text-[10px] text-text-muted ml-auto">
                        {cs.meta.configFormat.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {result?.error && (
                    <p className="mt-1 text-[10px] text-rose-400/80 pl-6 truncate" title={result.error}>{result.error}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {done ? (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim"
            >
              Done {succeeded > 0 && `(${succeeded} installed)`}
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isInstalling}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInstall}
                disabled={selectedClientIds.size === 0 || isInstalling}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInstalling
                  ? "Installing..."
                  : selectedClientIds.size > 1
                    ? `Install to ${selectedClientIds.size} clients`
                    : "Install"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
