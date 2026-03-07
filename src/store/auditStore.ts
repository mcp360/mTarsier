import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AuditEntry } from "../types/audit";

interface AuditStore {
  entries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  filterAction: string;
  filterClient: string;

  loadLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
  exportLogs: () => Promise<string>;
  setFilterAction: (action: string) => void;
  setFilterClient: (client: string) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  entries: [],
  isLoading: false,
  error: null,
  filterAction: "all",
  filterClient: "all",

  loadLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await invoke<AuditEntry[]>("get_audit_logs");
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  clearLogs: async () => {
    try {
      await invoke("clear_audit_logs");
      set({ entries: [] });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  exportLogs: async () => {
    const json = await invoke<string>("export_audit_logs");
    return json;
  },

  setFilterAction: (action) => set({ filterAction: action }),
  setFilterClient: (client) => set({ filterClient: client }),
}));
