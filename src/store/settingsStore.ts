import { create } from "zustand";

export type StatusBarStyle = "A" | "B" | "C" | "none";

const STORAGE_KEY = "mtarsier-settings";

function load(): { statusBarStyle: StatusBarStyle } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { statusBarStyle: "C" };
}

interface SettingsStore {
  statusBarStyle: StatusBarStyle;
  setStatusBarStyle: (style: StatusBarStyle) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...load(),
  setStatusBarStyle: (statusBarStyle) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ statusBarStyle }));
    set({ statusBarStyle });
  },
}));
