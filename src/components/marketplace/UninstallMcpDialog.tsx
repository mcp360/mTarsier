import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { useClientStore } from "../../store/clientStore";
import { getClientById } from "../../lib/clients";
import type { MarketplaceServer } from "../../data/marketplace";

function extractServersFromJson(
  content: string,
  configKey: string
): Record<string, unknown> {
  try {
    const json = JSON.parse(content);
    const keys = configKey.split(".");
    let current = json;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return {};
      }
    }
    return current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

interface Props {
  server: MarketplaceServer;
  /** Client names that have this server installed. */
  installedIn: string[];
  onClose: () => void;
  onSuccess: (clientName: string) => void;
}

function UninstallMcpDialog({ server, installedIn, onClose, onSuccess }: Props) {
  const { clients } = useClientStore();

  const installedClients = clients.filter(
    (cs) => installedIn.includes(cs.meta.name) && cs.meta.configPath !== null
  );

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    installedClients[0]?.meta.id ?? null
  );
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!selectedClientId) return;
    const client = getClientById(selectedClientId);
    if (!client || !client.configPath) return;

    setIsRemoving(true);
    setError(null);

    try {
      const content = await invoke<string>("get_client_config", {
        configPath: client.configPath,
      });

      // For scoped clients (Claude Code), try user scope first then local scope
      const scopesToCheck = client.supportsScopes
        ? ["mcpServers", client.configKey]
        : [client.configKey];

      let removed = false;
      for (const configKey of scopesToCheck) {
        let existing: Record<string, unknown>;
        if (client.configFormat === "toml") {
          const jsonStr = await invoke<string>("parse_toml_servers", {
            content,
            configKey: client.configKey,
          });
          existing = JSON.parse(jsonStr);
        } else {
          existing = extractServersFromJson(content, configKey);
        }

        if (server.id in existing) {
          const { [server.id]: _removed, ...remaining } = existing;
          await invoke("write_client_config", {
            request: {
              config_path: client.configPath,
              config_key: configKey,
              config_format: client.configFormat,
              servers: remaining,
            },
          });
          removed = true;
          break;
        }
      }

      if (!removed) {
        throw new Error("Server entry not found in config — it may have been removed already.");
      }

      onSuccess(client.name);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-sm shadow-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Remove: {server.name}</h3>
          <p className="text-xs text-text-muted mt-1">
            Choose which client to remove this server from.
          </p>
        </div>

        <div className="space-y-1.5 mb-4">
          {installedClients.map((cs) => {
            const isSelected = selectedClientId === cs.meta.id;
            return (
              <button
                key={cs.meta.id}
                type="button"
                onClick={() => setSelectedClientId(cs.meta.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-xs rounded-md border transition-colors",
                  isSelected
                    ? "border-rose-400/50 bg-rose-400/5 text-text"
                    : "border-border hover:border-border-hover text-text-muted hover:text-text"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors",
                      isSelected
                        ? "border-rose-400 bg-rose-400"
                        : "border-text-muted/40"
                    )}
                  />
                  <span className="font-medium text-[11px]">{cs.meta.name}</span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {cs.meta.configFormat.toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-md px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={!selectedClientId || isRemoving}
            className="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UninstallMcpDialog;
