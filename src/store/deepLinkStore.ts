import { create } from "zustand";

export type DeepLinkAction =
  | { type: "install-mcp"; serverId: string }
  | {
      type: "install-mcp-custom";
      name: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
      url?: string;
    }
  | { type: "install-skill"; source: string }
  | { type: "navigate"; path: string };

interface DeepLinkStore {
  pending: DeepLinkAction | null;
  consume: () => DeepLinkAction | null;
  setPending: (action: DeepLinkAction) => void;
  clear: () => void;
}

// ── Security: input validation ────────────────────────────────────────────

const MAX_NAME_LEN = 128;
const MAX_COMMAND_LEN = 512;
const MAX_ARGS_TOTAL_LEN = 4096;
const MAX_ENV_ENTRIES = 20;
const MAX_ENV_VAL_LEN = 2048;
const MAX_URL_LEN = 2048;

/** Only alphanumeric, hyphens, underscores, dots — no path traversal. */
const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** Reject dangerous keys that could cause prototype pollution. */
const POISONED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Reject URLs pointing to localhost, private IPs, or metadata endpoints. */
function isUnsafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(host)) return true;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return true;
    if (host === "169.254.169.254") return true; // cloud metadata
    if (u.protocol !== "https:" && u.protocol !== "http:") return true;
    return false;
  } catch {
    return true;
  }
}

// ── Parser ────────────────────────────────────────────────────────────────

/**
 * Parse a mtarsier:// deep link URL into an action.
 *
 * Supported formats:
 *   mtarsier://install/mcp/<server-id>         — marketplace MCP server
 *   mtarsier://install/mcp?name=...&command=... — custom MCP server
 *   mtarsier://install/skill?source=owner/repo  — skill from GitHub
 *   mtarsier://marketplace                      — navigate to marketplace
 *   mtarsier://skills                           — navigate to skills
 */
export function parseDeepLink(raw: string): DeepLinkAction | null {
  // Reject excessively long URLs early
  if (!raw || raw.length > 8192) return null;

  let url: URL;
  try {
    // mtarsier://install/mcp/foo → host="install", pathname="/mcp/foo"
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "mtarsier:") return null;

  const host = url.host; // e.g. "install", "marketplace"
  const pathParts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);

  if (host === "install") {
    const kind = pathParts[0]; // "mcp" or "skill"

    if (kind === "mcp") {
      const serverId = pathParts[1]; // e.g. "filesystem"

      if (serverId) {
        if (!SAFE_NAME_RE.test(serverId) || serverId.length > MAX_NAME_LEN) return null;
        return { type: "install-mcp", serverId };
      }

      // Custom MCP server: mtarsier://install/mcp?name=...&command=...
      const name = url.searchParams.get("name");
      const command = url.searchParams.get("command");
      const argsRaw = url.searchParams.get("args");
      const remoteUrl = url.searchParams.get("url");

      // Validate name
      if (!name || !SAFE_NAME_RE.test(name) || name.length > MAX_NAME_LEN) return null;
      if (POISONED_KEYS.has(name)) return null;

      // Validate command
      if (command && (command.length > MAX_COMMAND_LEN || !SAFE_NAME_RE.test(command))) return null;

      // Validate remote URL
      if (remoteUrl && (remoteUrl.length > MAX_URL_LEN || isUnsafeUrl(remoteUrl))) return null;

      // Need at least command or url
      if (!command && !remoteUrl) return null;

      // Validate args
      const args = argsRaw ? argsRaw.split(",") : [];
      if (argsRaw && argsRaw.length > MAX_ARGS_TOTAL_LEN) return null;

      // Validate env vars
      const env: Record<string, string> = {};
      let envCount = 0;
      url.searchParams.forEach((val, key) => {
        if (key.startsWith("env.")) {
          const envKey = key.slice(4);
          if (POISONED_KEYS.has(envKey)) return;
          if (!SAFE_NAME_RE.test(envKey)) return;
          if (val.length > MAX_ENV_VAL_LEN) return;
          if (++envCount > MAX_ENV_ENTRIES) return;
          env[envKey] = val;
        }
      });

      return {
        type: "install-mcp-custom",
        name,
        command: command ?? "",
        args,
        env: Object.keys(env).length > 0 ? env : undefined,
        url: remoteUrl ?? undefined,
      };
    }

    if (kind === "skill") {
      const source = url.searchParams.get("source");
      // Basic format: owner/repo or owner/repo/skill-name
      if (!source || source.length > 200) return null;
      if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)?$/.test(source)) return null;
      return { type: "install-skill", source };
    }

    return null;
  }

  // Navigation: mtarsier://marketplace, mtarsier://skills, etc.
  if (["marketplace", "skills", "config", "clients", "settings"].includes(host)) {
    return { type: "navigate", path: `/${host}` };
  }

  return null;
}

export const useDeepLinkStore = create<DeepLinkStore>((set, get) => ({
  pending: null,

  setPending: (action) => set({ pending: action }),

  consume: () => {
    const { pending } = get();
    if (pending) set({ pending: null });
    return pending;
  },

  clear: () => set({ pending: null }),
}));
