import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { extractServersFromJson } from "../../lib/mcpUtils";
import { useClientStore } from "../../store/clientStore";
import { getClientById } from "../../lib/clients";
import type { MarketplaceServer } from "../../data/marketplace";

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

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    () => new Set(installedClients.map((cs) => cs.meta.id))
  );
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeResults, setRemoveResults] = useState<{ id: string; name: string; success: boolean; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemove = async () => {
    if (selectedClientIds.size === 0) return;

    setIsRemoving(true);
    setError(null);
    setRemoveResults([]);

    // Resolve home dir for scoped clients (Claude Code uses {HOME} in configKey)
    let homeDir = "";
    if ([...selectedClientIds].some((id) => getClientById(id)?.supportsScopes)) {
      try {
        homeDir = await invoke<string>("get_home_dir");
      } catch {
        // fall through
      }
    }

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const clientId of selectedClientIds) {
      const client = getClientById(clientId);
      if (!client || !client.configPath) continue;

      try {
        const content = await invoke<string>("get_client_config", {
          configPath: client.configPath,
        });

        const resolvedConfigKey = client.configKey.replace("{HOME}", homeDir);
        const scopesToCheck = client.supportsScopes
          ? ["mcpServers", resolvedConfigKey]
          : [resolvedConfigKey];

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
            try { await invoke("create_backup", { configPath: client.configPath, clientId: client.id }); } catch {}
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

        if (!removed) throw new Error("Server entry not found in config.");
        results.push({ id: clientId, name: client.name, success: true });
      } catch (err) {
        results.push({ id: clientId, name: getClientById(clientId)?.name ?? clientId, success: false, error: String(err) });
      }
    }

    setRemoveResults(results);
    setIsRemoving(false);

    const succeeded = results.filter((r) => r.success);
    if (succeeded.length > 0) {
      const label = succeeded.length === 1 ? succeeded[0].name : `${succeeded.length} clients`;
      onSuccess(label);
    } else {
      setError("Failed to remove from all selected clients.");
    }
  };

  const isDone = removeResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={isDone ? onClose : undefined} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-sm shadow-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Remove: {server.name}</h3>
          <p className="text-xs text-text-muted mt-1">
            Select which clients to remove this server from.
          </p>
        </div>

        <div className="space-y-1.5 mb-4">
          {installedClients.map((cs) => {
            const isSelected = selectedClientIds.has(cs.meta.id);
            const result = removeResults.find((r) => r.id === cs.meta.id);
            return (
              <button
                key={cs.meta.id}
                type="button"
                onClick={() => toggleClient(cs.meta.id)}
                disabled={isRemoving || isDone}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-xs rounded-md border transition-colors",
                  isSelected
                    ? "border-rose-400/50 bg-rose-400/5 text-text"
                    : "border-border hover:border-border-hover text-text-muted hover:text-text",
                  (isRemoving || isDone) && "cursor-default"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                      isSelected ? "border-rose-400 bg-rose-400" : "border-text-muted/40"
                    )}
                  >
                    {isSelected && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-[11px]">{cs.meta.name}</span>
                  {result && (
                    <span className={cn("flex items-center gap-1 text-[10px] ml-auto", result.success ? "text-primary" : "text-rose-400")}>
                      {result.success ? (
                        <>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          removed
                        </>
                      ) : (
                        <>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          failed
                        </>
                      )}
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

        {error && !isDone && (
          <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-md px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
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
                disabled={isRemoving}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={selectedClientIds.size === 0 || isRemoving}
                className="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving
                  ? "Removing…"
                  : selectedClientIds.size > 1
                    ? `Remove from ${selectedClientIds.size} clients`
                    : "Remove"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UninstallMcpDialog;
