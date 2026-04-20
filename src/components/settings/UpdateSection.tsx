import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { useSettingsStore } from "../../store/settingsStore";

interface UpdateInfo {
  version: string;
  body: string | null;
}

type UpdateState = "idle" | "checking" | "up-to-date" | "available" | "installing";

export function UpdateSection() {
  const { autoUpdate, setAutoUpdate } = useSettingsStore();
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoUpdate) return;
    (async () => {
      setState("checking");
      try {
        const info = await invoke<UpdateInfo | null>("check_for_update");
        if (info) {
          setUpdateInfo(info);
          setState("installing");
          await invoke("install_update");
        } else {
          setState("up-to-date");
        }
      } catch {
        setState("idle");
      }
    })();
  }, [autoUpdate]);

  const handleCheck = async () => {
    setState("checking");
    setError(null);
    setUpdateInfo(null);
    try {
      const info = await invoke<UpdateInfo | null>("check_for_update");
      if (info) {
        setUpdateInfo(info);
        setState("available");
      } else {
        setState("up-to-date");
      }
    } catch (e) {
      setError(String(e));
      setState("idle");
    }
  };

  const handleInstall = async () => {
    setState("installing");
    setError(null);
    try {
      await invoke("install_update");
    } catch (e) {
      setError(String(e));
      setState("available");
    }
  };

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-1">
        Updates
      </h2>
      <p className="text-xs text-text-muted mb-4">
        Keep mTarsier up to date with the latest features and fixes.
      </p>

      <div className="max-w-2xl rounded-lg border border-border bg-surface p-4 space-y-3">
        {/* Auto-update toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">Auto Update</p>
            <p className="text-xs text-text-muted">Automatically check and install updates on launch.</p>
          </div>
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoUpdate ? "bg-primary" : "bg-text-muted/30"
            }`}
          >
            <span className="sr-only">Toggle auto update</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoUpdate ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Current version */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0 bg-primary" />
          <span className="text-sm">
            Current version:{" "}
            <span className="font-mono text-xs text-text-muted">{currentVersion || "…"}</span>
          </span>
        </div>

        {/* Check button */}
        {state !== "available" && (
          <button
            onClick={handleCheck}
            disabled={state === "checking" || state === "installing"}
            className="px-3 py-1.5 rounded border border-primary/40 text-primary/80 text-sm
              hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "checking" ? "Checking…" : "Check for Updates"}
          </button>
        )}

        {/* Up to date */}
        {state === "up-to-date" && (
          <p className="text-xs text-primary">You're on the latest version.</p>
        )}

        {/* Update available / installing */}
        {(state === "available" || state === "installing") && updateInfo && (
          <div className="space-y-3">
            <div className="rounded border border-cyan/30 bg-cyan/5 p-3 space-y-2">
              <p className="text-xs text-cyan font-medium">
                Update available: v{updateInfo.version}
              </p>
              {updateInfo.body && (
                <p className="text-xs text-text-muted whitespace-pre-wrap">{updateInfo.body}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                disabled={state === "installing"}
                className="px-3 py-1.5 rounded border border-cyan/40 text-cyan/80 text-sm
                  hover:border-cyan hover:text-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === "installing" ? "Installing…" : "Install & Restart"}
              </button>
              <button
                onClick={() => setState("idle")}
                className="px-3 py-1.5 rounded border border-border text-text-muted text-sm
                  hover:border-text-muted hover:text-text transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </section>
  );
}
