import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "../../lib/utils";
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
  /** Client names that already have this server installed. */
  installedIn: string[];
  onClose: () => void;
  onSuccess: (clientName: string) => void;
}

function InstallMcpDialog({ server, installedIn, onClose, onSuccess }: Props) {
  const { clients } = useClientStore();

  const availableClients = clients.filter(
    (cs) => cs.meta.configPath !== null && cs.installed
  );

  const hasConfig =
    (server.apiKeys && server.apiKeys.length > 0) ||
    (server.params && server.params.length > 0);

  const [step, setStep] = useState<1 | 2>(hasConfig ? 1 : 2);
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    availableClients[0]?.meta.id ?? null
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!selectedClientId) return;
    const client = getClientById(selectedClientId);
    if (!client || !client.configPath) return;

    setIsInstalling(true);
    setError(null);

    try {
      // Detect if client supports native remote transport (no mcp-remote needed)
      const supportsNativeRemote = client.supportedTransports.some(
        (t) => t === "streamable-http" || t === "sse"
      );

      let newServerData: Record<string, unknown>;

      if (server.remoteUrl && supportsNativeRemote && resolvedRemoteUrl) {
        // Use direct URL — cleaner, no npx/mcp-remote dependency
        newServerData = { url: resolvedRemoteUrl };
      } else {
        // Build args with {param} substitutions (stdio / mcp-remote fallback)
        const args = server.args.map((arg) => {
          let result = arg;
          for (const [key, value] of Object.entries(paramValues)) {
            result = result.replace(`{${key}}`, value.trim());
          }
          return result;
        });

        // Build env from API keys
        const env: Record<string, string> = {};
        for (const [key, value] of Object.entries(apiKeyValues)) {
          if (value.trim()) env[key] = value.trim();
        }

        newServerData = { command: server.command, args };
        if (Object.keys(env).length > 0) newServerData.env = env;
      }

      // For Claude Code (scoped), default to user scope → "mcpServers"
      const configKey = client.supportsScopes ? "mcpServers" : client.configKey;

      // Read + merge existing servers
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

      await invoke("write_client_config", {
        request: {
          config_path: client.configPath,
          config_key: configKey,
          config_format: client.configFormat,
          servers: mergedServers,
        },
      });

      onSuccess(client.name);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-surface border border-border rounded-lg p-5 w-full max-w-md shadow-2xl">
        {/* Title + step indicator */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold">Install: {server.name}</h3>
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

        {/* Step 2 — select client */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">Install to:</p>

            {availableClients.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6 bg-base rounded-md border border-border">
                No installed clients found.
              </p>
            ) : (
              <div className="space-y-1.5">
                {availableClients.map((cs) => {
                  const alreadyInstalled = installedIn.includes(cs.meta.name);
                  const isSelected = selectedClientId === cs.meta.id;
                  return (
                    <button
                      key={cs.meta.id}
                      type="button"
                      onClick={() => setSelectedClientId(cs.meta.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs rounded-md border transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/5 text-text"
                          : "border-border hover:border-border-hover text-text-muted hover:text-text"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-text-muted/40"
                          )}
                        />
                        <span className="font-medium text-[11px]">
                          {cs.meta.name}
                        </span>
                        {alreadyInstalled && (
                          <span className="flex items-center gap-1 text-[10px] text-primary/70">
                            <svg
                              className="w-2.5 h-2.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            installed
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted ml-auto">
                          {cs.meta.configFormat.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

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

            {error && (
              <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {hasConfig ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
                >
                  ← Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border rounded-md"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleInstall}
                disabled={!selectedClientId || isInstalling || availableClients.length === 0}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-base rounded-md hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInstalling ? "Installing..." : "Install"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallMcpDialog;
