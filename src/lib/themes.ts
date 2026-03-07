export type ThemeId = "tarsier" | "dark" | "light";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    base: string;
    "base-light": string;
    "base-lighter": string;
    primary: string;
    "primary-dim": string;
    cyan: string;
    amber: string;
    purple: string;
    surface: string;
    "surface-hover": string;
    "surface-overlay": string;
    border: string;
    "border-hover": string;
    text: string;
    "text-muted": string;
  };
  monaco: {
    base: "vs-dark" | "vs";
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
    cursor: string;
    lineNumber: string;
    lineNumberActive: string;
    widgetBg: string;
    widgetBorder: string;
    scrollbar: string;
    scrollbarHover: string;
  };
}

export const themes: Record<ThemeId, ThemeDefinition> = {
  tarsier: {
    id: "tarsier",
    name: "Tarsier",
    description: "Default dark green theme",
    colors: {
      base: "#080c0a",
      "base-light": "#0f1612",
      "base-lighter": "#1a2420",
      primary: "#00ff88",
      "primary-dim": "#00cc6a",
      cyan: "#00d4ff",
      amber: "#ffb800",
      purple: "#a78bfa",
      surface: "#111916",
      "surface-hover": "#162019",
      "surface-overlay": "#1a2420",
      border: "#243d33",
      "border-hover": "#3d5c4e",
      text: "#e0ece6",
      "text-muted": "#7a9488",
    },
    monaco: {
      base: "vs-dark",
      background: "#111916",
      foreground: "#e0ece6",
      lineHighlight: "#1a242022",
      selection: "#00ff8830",
      cursor: "#00ff88",
      lineNumber: "#7a9488",
      lineNumberActive: "#00ff88",
      widgetBg: "#0f1612",
      widgetBorder: "#1e2e27",
      scrollbar: "#1e2e2766",
      scrollbarHover: "#1e2e27aa",
    },
  },

  dark: {
    id: "dark",
    name: "Midnight",
    description: "Pure dark theme with blue accent",
    colors: {
      base: "#09090b",
      "base-light": "#111113",
      "base-lighter": "#1a1a1e",
      primary: "#6366f1",
      "primary-dim": "#4f46e5",
      cyan: "#22d3ee",
      amber: "#f59e0b",
      purple: "#a78bfa",
      surface: "#131316",
      "surface-hover": "#1c1c21",
      "surface-overlay": "#1a1a1e",
      border: "#2e2e33",
      "border-hover": "#4a4a52",
      text: "#e4e4e7",
      "text-muted": "#71717a",
    },
    monaco: {
      base: "vs-dark",
      background: "#131316",
      foreground: "#e4e4e7",
      lineHighlight: "#1c1c2122",
      selection: "#6366f130",
      cursor: "#6366f1",
      lineNumber: "#71717a",
      lineNumberActive: "#6366f1",
      widgetBg: "#111113",
      widgetBorder: "#27272a",
      scrollbar: "#27272a66",
      scrollbarHover: "#27272aaa",
    },
  },

  light: {
    id: "light",
    name: "Daylight",
    description: "Clean light theme",
    colors: {
      base: "#f8faf9",
      "base-light": "#f0f4f2",
      "base-lighter": "#e6ebe8",
      primary: "#059669",
      "primary-dim": "#047857",
      cyan: "#0891b2",
      amber: "#d97706",
      purple: "#7c3aed",
      surface: "#ffffff",
      "surface-hover": "#f0f4f2",
      "surface-overlay": "#e6ebe8",
      border: "#c4cec9",
      "border-hover": "#9aada5",
      text: "#1a2e24",
      "text-muted": "#5f7a6e",
    },
    monaco: {
      base: "vs",
      background: "#ffffff",
      foreground: "#1a2e24",
      lineHighlight: "#f0f4f208",
      selection: "#05966920",
      cursor: "#059669",
      lineNumber: "#5f7a6e",
      lineNumberActive: "#059669",
      widgetBg: "#f8faf9",
      widgetBorder: "#d1d9d5",
      scrollbar: "#d1d9d566",
      scrollbarHover: "#d1d9d5aa",
    },
  },
};

export function getMonacoTheme(theme: ThemeDefinition) {
  const t = theme.monaco;
  const c = theme.colors;
  return {
    base: t.base as "vs-dark" | "vs",
    inherit: true,
    rules: [
      { token: "", foreground: strip(t.foreground), background: strip(t.background) },
      { token: "string.key.json", foreground: strip(c.cyan) },
      { token: "string.value.json", foreground: strip(c.primary) },
      { token: "string", foreground: strip(c.primary) },
      { token: "number", foreground: strip(c.amber) },
      { token: "number.json", foreground: strip(c.amber) },
      { token: "keyword", foreground: strip(c.purple) },
      { token: "keyword.json", foreground: strip(c.purple) },
      { token: "delimiter", foreground: strip(c["text-muted"]) },
      { token: "comment", foreground: strip(c["text-muted"]) },
    ],
    colors: {
      "editor.background": t.background,
      "editor.foreground": t.foreground,
      "editor.lineHighlightBackground": t.lineHighlight,
      "editor.selectionBackground": t.selection,
      "editorCursor.foreground": t.cursor,
      "editorLineNumber.foreground": t.lineNumber,
      "editorLineNumber.activeForeground": t.lineNumberActive,
      "editorWidget.background": t.widgetBg,
      "editorWidget.border": t.widgetBorder,
      "input.background": t.widgetBg,
      "input.border": t.widgetBorder,
      "scrollbarSlider.background": t.scrollbar,
      "scrollbarSlider.hoverBackground": t.scrollbarHover,
    },
  };
}

function strip(hex: string): string {
  return hex.replace("#", "");
}
