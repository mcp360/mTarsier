import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "../../lib/utils";
import { extractServersFromJson } from "../../lib/mcpUtils";
import { useClientStore } from "../../store/clientStore";
import { getClientById, CLIENT_REGISTRY } from "../../lib/clients";
import type { MarketplaceServer } from "../../data/marketplace";

/** Splits a hint string into before/urlText/url/after.
 *  Finds the first domain-like token (e.g. "sentry.io", "github.com/settings/tokens").
 *  Returns null when no URL is detected (plain info text). */
function parseHint(hint: string): { before: string; urlText: string; url: string; after: string } | null {
  const match = hint.match(/((?:[\w-]+\.)+(?:com|io|ai|app|so|dev|net|org|co|cloud)(?:\/[\w./\-]*)?)/i);
  if (!match || match.index === undefined) return null;
  const urlText = match[1];
  const url = `https://${urlText}`;
  const before = hint.slice(0, match.index);
  const after = hint.slice(match.index + urlText.length);
  return { before, urlText, url, after };
}


interface Props {
  server: MarketplaceServer;
  /** Client names that already have this server installed. */
  installedIn: string[];
  onClose: () => void;
  onSuccess: (clientNames: string[], mode: "install" | "remove") => void;
}

function InstallMcpDialog({ server, installedIn, onClose, onSuccess }: Props) {
  const { clients } = useClientStore();

  const availableClients = clients.filter(
    (cs) => cs.meta.configPath !== null && cs.installed
  );

  const hasConfig =
    (server.apiKeys && server.apiKeys.length > 0) ||
    (server.params && server.params.length > 0);

  // Which clients already have this server
  const installedClientIds = new Set(
    availableClients.filter((cs) => installedIn.includes(cs.meta.name)).map((cs) => cs.meta.id)
  );
  const allInstalled = availableClients.length > 0 && availableClients.every((cs) => installedIn.includes(cs.meta.name));

  // Default to remove mode when every available client already has it installed
  const [mode, setMode] = useState<"install" | "remove">(allInstalled ? "remove" : "install");

  const defaultSelection = (m: "install" | "remove"): Set<string> => {
    if (m === "remove") {
      return new Set(installedClientIds);
    }
    // Install: pre-select clients that DON'T have it yet; fall back to first if all installed
    const uninstalled = availableClients.filter((cs) => !installedIn.includes(cs.meta.name)).map((cs) => cs.meta.id);
    return new Set(uninstalled.length > 0 ? uninstalled : (availableClients[0]?.meta.id ? [availableClients[0].meta.id] : []));
  };

  const [step, setStep] = useState<1 | 2>(hasConfig ? 1 : 2);
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(() => defaultSelection(allInstalled ? "remove" : "install"));
  const [isInstalling, setIsInstalling] = useState(false);
  const [actionResults, setActionResults] = useState<{ id: string; name: string; success: boolean; error?: string }[]>([]);

  const switchMode = (m: "install" | "remove") => {
    setMode(m);
    setActionResults([]);
    setSelectedClientIds(defaultSelection(m));
  };

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requiredApiKeysFilled = (server.apiKeys ?? [])
    .filter((k) => k.required)
    .every((k) => apiKeyValues[k.key]?.trim());

  const requiredParamsFilled = (server.params ?? [])
    .filter((p) => p.required)
    .every((p) => paramValues[p.key]?.trim());

  const canContinue = requiredApiKeysFilled && requiredParamsFilled;

  // Resolve remoteUrl substitutions for display + install
  const resolvedRemoteUrl = server.remoteUrl
    ? Object.entries(paramValues).reduce(
        (url, [key, val]) => url.replace(`{${key}}`, val.trim()),
        server.remoteUrl
      )
    : null;

  // Web clients that have no config file — shown as a guide when server has remoteUrl
  const webClients = server.remoteUrl
    ? CLIENT_REGISTRY.filter((c) => c.configPath === null && c.setupSteps)
    : [];

  const [urlCopied, setUrlCopied] = useState(false);
  const copyUrl = () => {
    if (!resolvedRemoteUrl) return;
    navigator.clipboard.writeText(resolvedRemoteUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleInstall = async () => {
    if (selectedClientIds.size === 0) return;

    setIsInstalling(true);
    setActionResults([]);

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const clientId of selectedClientIds) {
      const client = getClientById(clientId);
      if (!client || !client.configPath) continue;

      try {
        const supportsNativeRemote = client.supportedTransports.some(
          (t) => t === "streamable-http" || t === "sse"
        );

        let newServerData: Record<string, unknown>;

        if (server.remoteUrl && supportsNativeRemote && resolvedRemoteUrl) {
          newServerData = { url: resolvedRemoteUrl };
        } else {
          const args = server.args.map((arg) => {
            let result = arg;
            for (const [key, value] of Object.entries(paramValues)) {
              result = result.replace(`{${key}}`, value.trim());
            }
            return result;
          });

          const env: Record<string, string> = {};
          for (const [key, value] of Object.entries(apiKeyValues)) {
            if (value.trim()) env[key] = value.trim();
          }

          newServerData = { command: server.command, args };
          if (Object.keys(env).length > 0) newServerData.env = env;
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
          // Config doesn't exist yet — start fresh
        }

        const mergedServers = { ...existingServers, [server.id]: newServerData };

        try { await invoke("create_backup", { configPath: client.configPath, clientId: client.id }); } catch {}

        await invoke("write_client_config", {
          request: {
            config_path: client.configPath,
            config_key: configKey,
            config_format: client.configFormat,
            servers: mergedServers,
          },
        });

        results.push({ id: clientId, name: client.name, success: true });
      } catch (err) {
        results.push({ id: clientId, name: getClientById(clientId)?.name ?? clientId, success: false, error: String(err) });
      }
    }

    setActionResults(results);
    setIsInstalling(false);

    const succeeded = results.filter((r) => r.success).map((r) => r.name);
    if (succeeded.length > 0) {
      onSuccess(succeeded, "install");
    }
  };

  const handleRemove = async () => {
    if (selectedClientIds.size === 0) return;

    setIsInstalling(true);
    setActionResults([]);

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

        if (!removed) throw new Error("Server entry not found — may have been removed already.");
        results.push({ id: clientId, name: client.name, success: true });
      } catch (err) {
        results.push({ id: clientId, name: getClientById(clientId)?.name ?? clientId, success: false, error: String(err) });
      }
    }

    setActionResults(results);
    setIsInstalling(false);

    const succeeded = results.filter((r) => r.success).map((r) => r.name);
    if (succeeded.length > 0) {
      onSuccess(succeeded, "remove");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-md shadow-2xl">
        {/* Title + step indicator */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold">{mode === "remove" && step === 2 ? "Remove" : "Install"}: {server.name}</h3>
          {hasConfig && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  step === 1 ? "text-primary" : "text-text-muted"
                )}
              >
                1. Configure
              </span>
              <span className="text-text-muted text-xs">→</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === 2 ? "text-primary" : "text-text-muted"
                )}
              >
                2. Select Client
              </span>
            </div>
          )}
        </div>

        {/* Step 1 — configuration */}
        {step === 1 && (
          <div className="space-y-3">
            {server.apiKeys?.map((apiKey) => (
              <div key={apiKey.key}>
                <label className="text-xs font-medium text-text-muted mb-1 block">
                  {apiKey.label}
                  {apiKey.required && (
                    <span className="text-rose-400 ml-0.5">*</span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKeyValues[apiKey.key] ?? ""}
                  onChange={(e) =>
                    setApiKeyValues((prev) => ({
                      ...prev,
                      [apiKey.key]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${apiKey.label}`}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
                />
                {apiKey.hint && (() => {
                  const parsed = parseHint(apiKey.hint!);
                  if (!parsed) return <p className="text-[11px] text-text-muted mt-1">→ {apiKey.hint}</p>;
                  return (
                    <p className="text-[11px] text-text-muted mt-1">
                      → {parsed.before}
                      <button type="button" onClick={() => open(parsed.url)} className="underline hover:text-text transition-colors cursor-pointer">
                        {parsed.urlText}
                      </button>
                      {parsed.after}
                    </p>
                  );
                })()}
              </div>
            ))}

            {server.params?.map((param) => (
              <div key={param.key}>
                <label className="text-xs font-medium text-text-muted mb-1 block">
                  {param.label}
                  {param.required && (
                    <span className="text-rose-400 ml-0.5">*</span>
                  )}
                </label>
                <input
                  type={param.secret ? "password" : "text"}
                  value={paramValues[param.key] ?? ""}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [param.key]: e.target.value,
                    }))
                  }
                  placeholder={param.placeholder}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
                />
                {param.hint && (() => {
                  const parsed = parseHint(param.hint!);
                  if (!parsed) return <p className="text-[11px] text-text-muted mt-1">→ {param.hint}</p>;
                  return (
                    <p className="text-[11px] text-text-muted mt-1">
                      → {parsed.before}
                      <button type="button" onClick={() => open(parsed.url)} className="underline hover:text-text transition-colors cursor-pointer">
                        {parsed.urlText}
                      </button>
                      {parsed.after}
                    </p>
                  );
                })()}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinue}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — select clients */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Mode toggle */}
            {installedClientIds.size > 0 && (
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => switchMode("install")}
                  disabled={isInstalling || actionResults.length > 0}
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
                  disabled={isInstalling || actionResults.length > 0}
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

            {/* Client list — remove mode shows only installed clients */}
            {(() => {
              const visibleClients = mode === "remove"
                ? availableClients.filter((cs) => installedIn.includes(cs.meta.name))
                : availableClients;

              if (visibleClients.length === 0) {
                return (
                  <p className="text-xs text-text-muted text-center py-6 bg-base rounded-md border border-border">
                    {mode === "remove" ? "Not installed in any client." : "No installed clients found."}
                  </p>
                );
              }

              return (
                <div className="space-y-1.5">
                  {visibleClients.map((cs) => {
                    const alreadyInstalled = installedIn.includes(cs.meta.name);
                    const isSelected = selectedClientIds.has(cs.meta.id);
                    const result = actionResults.find((r) => r.id === cs.meta.id);
                    const isRemoveMode = mode === "remove";
                    return (
                      <button
                        key={cs.meta.id}
                        type="button"
                        onClick={() => toggleClient(cs.meta.id)}
                        disabled={isInstalling || actionResults.length > 0}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs rounded-md border transition-colors",
                          isSelected
                            ? isRemoveMode
                              ? "border-rose-400/50 bg-rose-400/5 text-text"
                              : "border-primary/50 bg-primary/5 text-text"
                            : "border-border hover:border-border-hover text-text-muted hover:text-text",
                          (isInstalling || actionResults.length > 0) && "cursor-default"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                              isSelected
                                ? isRemoveMode
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
                          {alreadyInstalled && !result && mode === "install" && (
                            <span className="flex items-center gap-1 text-[10px] text-primary/70">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              installed
                            </span>
                          )}
                          {result && (
                            <span className={cn("flex items-center gap-1 text-[10px] ml-auto", result.success ? "text-primary" : "text-rose-400")}>
                              {result.success ? (
                                <>
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  done
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
              );
            })()}

            {/* Web client guide — shown when server supports remote URL */}
            {webClients.length > 0 && resolvedRemoteUrl && (
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-[11px] text-text-muted font-medium">
                  Web clients — add this URL manually:
                </p>
                <div className="flex items-center gap-2 bg-base rounded-md px-2.5 py-1.5 border border-border">
                  <span className="text-[10px] font-mono text-text-muted truncate flex-1 min-w-0">
                    {resolvedRemoteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="flex-shrink-0 text-[10px] text-primary/70 hover:text-primary transition-colors"
                  >
                    {urlCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted/70 leading-relaxed">
                  Paste into{" "}
                  {webClients.map((c) => c.name).join(", ")}{" "}
                  under Settings → Connectors / Apps.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {actionResults.length > 0 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim"
                >
                  Done
                </button>
              ) : (
                <>
                  {hasConfig && mode === "install" ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={isInstalling}
                      className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-50"
                    >
                      ← Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isInstalling}
                      className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  {mode === "install" ? (
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={selectedClientIds.size === 0 || isInstalling || availableClients.length === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInstalling
                        ? "Installing..."
                        : selectedClientIds.size > 1
                          ? `Install to ${selectedClientIds.size} clients`
                          : "Install"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={selectedClientIds.size === 0 || isInstalling}
                      className="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInstalling
                        ? "Removing..."
                        : selectedClientIds.size > 1
                          ? `Remove from ${selectedClientIds.size} clients`
                          : "Remove"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallMcpDialog;
