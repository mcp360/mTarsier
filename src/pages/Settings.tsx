import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";
import { themes, type ThemeId } from "../lib/themes";
import { FlowSection } from "../components/settings/FlowSection";
import { UpdateSection } from "../components/settings/UpdateSection";

const themeList = Object.values(themes);

function ThemePreview({ id, active }: { id: ThemeId; active: boolean }) {
  const t = themes[id];
  const c = t.colors;
  return (
    <div
      className="w-full h-20 rounded-lg border overflow-hidden"
      style={{
        backgroundColor: c.base,
        borderColor: active ? c.primary : c.border,
      }}
    >
      {/* Mini sidebar + content preview */}
      <div className="flex h-full">
        <div
          className="w-10 h-full flex flex-col items-center gap-1.5 pt-2"
          style={{ backgroundColor: c.surface, borderRight: `1px solid ${c.border}` }}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.primary, opacity: 0.8 }} />
          <div className="w-4 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
          <div className="w-4 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: c.text }} />
          <div className="w-20 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
          <div className="flex gap-1 mt-1">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.primary, opacity: 0.2 }} />
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.cyan, opacity: 0.2 }} />
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.amber, opacity: 0.2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CliSection() {
  const [installedPath, setInstalledPath] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ path: string; needs_path_update: boolean } | null>(null);

  useEffect(() => {
    invoke<string | null>("check_cli_installed").then(setInstalledPath);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    setResult(null);
    try {
      const res = await invoke<{ path: string; needs_path_update: boolean }>("install_cli");
      setResult(res);
      setInstalledPath(res.path);
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const pathExport = `export PATH="$HOME/.local/bin:$PATH"`;

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-1">
        CLI Tool
      </h2>
      <p className="text-xs text-text-muted mb-4">
        Install <span className="font-mono text-text">tsr</span> to manage MCP servers from your terminal.
      </p>

      <div className="max-w-2xl rounded-lg border border-border bg-surface p-4 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${installedPath ? "bg-primary" : "bg-text-muted/30"}`} />
          <span className="text-sm">
            {installedPath
              ? <span>Installed at <span className="font-mono text-xs text-text-muted">{installedPath}</span></span>
              : <span className="text-text-muted">Not installed</span>}
          </span>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-3 py-1.5 rounded border border-primary/40 text-primary/80 text-sm
            hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {installing ? "Installing…" : installedPath ? "Reinstall" : "Install tsr CLI"}
        </button>

        {/* Success */}
        {result && (
          <div className="space-y-2">
            <p className="text-xs text-primary">
              ✓ Installed to <span className="font-mono">{result.path}</span>
            </p>
            {result.needs_path_update && (
              <div className="rounded border border-amber/30 bg-amber/5 p-3 space-y-1.5">
                <p className="text-xs text-amber">
                  Add <span className="font-mono">~/.local/bin</span> to your PATH to use <span className="font-mono">tsr</span> from any terminal:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono bg-base rounded px-2 py-1 text-text-muted select-all">
                    {pathExport}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(pathExport)}
                    className="text-[10px] text-text-muted hover:text-text px-1.5 py-1 border border-border rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-text-muted">Add this to your <span className="font-mono">~/.zshrc</span> or <span className="font-mono">~/.bash_profile</span> and restart your terminal.</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </section>
  );
}

function Settings() {
  const { themeId, setTheme } = useThemeStore();
  const { auditLogsEnabled, setAuditLogsEnabled } = useSettingsStore();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-text-muted">Application settings and preferences.</p>
      </div>

      <div className="flex-1 space-y-8 px-6 pb-6">

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          Theme
        </h2>
        <div className="grid grid-cols-3 gap-4 max-w-2xl">
          {themeList.map((t) => {
            const isActive = themeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-text-muted/30 bg-surface"
                }`}
              >
                <ThemePreview id={t.id} active={isActive} />
                <div className="mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          Privacy & Logs
        </h2>
        <div className="max-w-2xl space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-text">Audit Logs</h3>
                <p className="mt-1 text-xs text-text-muted">
                  Track all configuration changes and operations performed in the application.
                  When disabled, no audit logs will be recorded.
                </p>
              </div>
              <button
                onClick={() => setAuditLogsEnabled(!auditLogsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  auditLogsEnabled ? "bg-primary" : "bg-text-muted/30"
                }`}
              >
                <span className="sr-only">Toggle audit logs</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    auditLogsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {!auditLogsEnabled && (
              <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-400">
                  ⚠️ Audit logging is disabled. Configuration changes will not be tracked.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

        <CliSection />

        <FlowSection />

        <UpdateSection />

      </div>
    </div>
  );
}

export default Settings;
