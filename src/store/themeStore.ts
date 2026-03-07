import { create } from "zustand";
import { themes, type ThemeId, type ThemeDefinition } from "../lib/themes";

const STORAGE_KEY = "mtarsier-theme";

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in themes) return stored as ThemeId;
  } catch {}
  return "tarsier";
}

function applyThemeToDOM(theme: ThemeDefinition) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }
  // shadcn bridge: keep any shadcn components theme-aware
  root.style.setProperty("--background", theme.colors.base);
  root.style.setProperty("--foreground", theme.colors.text);
  root.style.setProperty("--card", theme.colors.surface);
  root.style.setProperty("--muted", theme.colors["surface-hover"]);
  root.style.setProperty("--muted-foreground", theme.colors["text-muted"]);
  root.style.setProperty("--border", theme.colors.border);
}

interface ThemeStore {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>((set) => {
  const initialId = getStoredTheme();
  const initialTheme = themes[initialId];

  // Apply on store creation
  applyThemeToDOM(initialTheme);

  return {
    themeId: initialId,
    theme: initialTheme,

    setTheme: (id) => {
      const theme = themes[id];
      localStorage.setItem(STORAGE_KEY, id);
      applyThemeToDOM(theme);
      set({ themeId: id, theme });
    },
  };
});
