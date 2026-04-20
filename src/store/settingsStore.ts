import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type StatusBarStyle = "A" | "B" | "C" | "none";

const STORAGE_KEY = "mtarsier-settings";

interface StoredSettings {
  statusBarStyle: StatusBarStyle;
  auditLogsEnabled: boolean;
  autoUpdate: boolean;
}

function load(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        statusBarStyle: parsed.statusBarStyle || "C",
        auditLogsEnabled: parsed.auditLogsEnabled !== undefined ? parsed.auditLogsEnabled : true,
        autoUpdate: parsed.autoUpdate !== undefined ? parsed.autoUpdate : true,
      };
    }
  } catch {}
  return { statusBarStyle: "C", auditLogsEnabled: true, autoUpdate: true };
}

interface SettingsStore extends StoredSettings {
  setStatusBarStyle: (style: StatusBarStyle) => void;
  setAuditLogsEnabled: (enabled: boolean) => void;
  setAutoUpdate: (enabled: boolean) => void;
}

const initial = load();
// Sync audit setting to backend on startup
invoke("set_audit_enabled", { enabled: initial.auditLogsEnabled }).catch(() => {});

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initial,

  setStatusBarStyle: (statusBarStyle) => {
    const state = { ...get(), statusBarStyle };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set({ statusBarStyle });
  },

  setAuditLogsEnabled: (auditLogsEnabled) => {
    const state = { ...get(), auditLogsEnabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set({ auditLogsEnabled });
    invoke("set_audit_enabled", { enabled: auditLogsEnabled }).catch(() => {});
  },

  setAutoUpdate: (autoUpdate) => {
    const state = { ...get(), autoUpdate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set({ autoUpdate });
  },
}));
