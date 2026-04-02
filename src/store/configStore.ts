import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getClientById } from "../lib/clients";
import { useClientStore } from "./clientStore";
import type { BackupEntry, RestoreDiff, PendingRestore } from "../types/config";
import type { ClientMeta } from "../types/client";

interface ServerEntry {
  enabled: boolean;
  externally_removed?: boolean;
  config: Record<string, unknown>;
}
type MtarsierStore = Record<string, ServerEntry>;

// TODO: migrate to @tauri-apps/plugin-os (platform() → "windows"|"linux"|"macos")
// navigator.platform is deprecated per MDN but still works in all current Tauri WebView backends.
const nav = typeof navigator !== "undefined" ? navigator.platform : "";
const IS_WINDOWS = nav.toLowerCase().startsWith("win");
const IS_LINUX = nav.toLowerCase().startsWith("linux");

/** Returns the config file path appropriate for the current OS. */
function getEffectiveConfigPath(client: ClientMeta): string | null {
  if (IS_WINDOWS && client.configPathWin) return client.configPathWin;
  if (IS_LINUX && client.configPathLinux) return client.configPathLinux;
  return client.configPath;
}

let _homeDir: string | null = null;

async function getHomeDir(): Promise<string> {
  if (!_homeDir) {
    _homeDir = await invoke<string>("get_home_dir");
  }
  return _homeDir;
}

function resolveConfigKeySync(key: string): string {
  if (_homeDir && key.includes("{HOME}")) {
    return key.replace("{HOME}", _homeDir);
  }
  return key;
}

/** Config file contains non-MCP data — scope editor to servers only */
function isSharedConfigFile(client: ClientMeta): boolean {
  return !!client.isSharedFile;
}

/** Check if a client supports multiple scopes (Claude Code only) */
function hasScopedConfig(client: ClientMeta): boolean {
  return !!client.supportsScopes;
}

export interface ProjectScope {
  path: string;
  server_count: number;
}

type EditorMode = "easy" | "edit";

interface ConfigStore {
  selectedClientId: string | null;
  selectedClient: ClientMeta | null;
  mode: EditorMode;
  rawContent: string;
  originalContent: string;
  servers: Record<string, unknown>;
  disabledServers: Record<string, unknown>;
  removedServers: Record<string, unknown>;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  backups: BackupEntry[];
  showBackupPanel: boolean;
  pendingRestore: PendingRestore | null;

  // Scope support (Claude Code)
  // "user"  = root mcpServers (--scope user, global)
  // "local" = projects[HOME].mcpServers (--scope local, default)
  // <path>  = projects[path].mcpServers (per-project local)
  activeScope: "user" | "local" | string;
  projectScopes: ProjectScope[];

  setSelectedClient: (clientId: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setRawContent: (content: string) => void;
  loadConfig: (clientId: string) => Promise<void>;
  saveConfig: () => Promise<void>;
  formatJson: () => void;
  validateContent: () => Promise<void>;
  loadBackups: () => Promise<void>;
  restoreBackup: (filename: string) => Promise<void>;
  previewRestore: (filename: string) => Promise<void>;
  confirmRestore: () => Promise<void>;
  cancelRestore: () => void;
  deleteBackup: (filename: string) => Promise<void>;
  toggleBackupPanel: () => void;
  addServer: (name: string, data: Record<string, unknown>) => void;
  updateServer: (name: string, data: Record<string, unknown>) => void;
  removeServer: (name: string) => void;
  toggleServer: (name: string) => void;
  restoreRemovedServer: (name: string) => void;
  dismissRemovedServer: (name: string) => void;
  createDefaultConfig: () => Promise<void>;
  setScope: (scope: "user" | string) => void;
}

/**
 * Resolve the JSON key path for a given scope:
 *   "user"  → root mcpServers in ~/.claude.json  (claude mcp add --scope user)
 *   "local" → projects[HOME].mcpServers           (claude mcp add --scope local / default)
 *   <path>  → projects[path].mcpServers           (per-project local scope)
 */
function getEffectiveConfigKey(client: ClientMeta, scope: "user" | "local" | string): string {
  if (!hasScopedConfig(client)) return client.configKey;
  if (scope === "user") return "mcpServers";
  if (scope === "local") return resolveConfigKeySync(client.configKey);
  return `projects.${scope}.mcpServers`;
}

function serversToFullConfig(
  client: ClientMeta,
  servers: Record<string, unknown>,
  existingContent?: string,
  effectiveKey?: string
): string {
  let root: Record<string, unknown> = {};
  if (existingContent) {
    try {
      root = JSON.parse(existingContent);
    } catch {
      root = {};
    }
  }
  const resolvedKey = effectiveKey ?? resolveConfigKeySync(client.configKey);
  const keys = resolvedKey.split(".");
  let current: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = servers;
  return JSON.stringify(root, null, 2);
}

function extractServers(content: string, configKey: string, effectiveKey?: string): Record<string, unknown> {
  try {
    const json = JSON.parse(content);
    const resolvedKey = effectiveKey ?? resolveConfigKeySync(configKey);
    const keys = resolvedKey.split(".");
    let current = json;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return {};
      }
    }
    return (current && typeof current === "object" && !Array.isArray(current))
      ? current as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/**
 * Build the mTarsier store key for a client + scope.
 * Per-project Claude Code scopes can be absolute paths (e.g. "/Users/john/myproject").
 * Path separators must be sanitized so the key is safe to use as a flat filename component.
 */
function buildStoreKey(id: string, scope: string): string {
  if (scope && scope !== "user") {
    const safeScope = scope.replace(/[/\\]/g, "-");
    return `${id}_${safeScope}`;
  }
  return id;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  selectedClientId: null,
  selectedClient: null,
  mode: "easy",
  rawContent: "",
  originalContent: "",
  servers: {},
  disabledServers: {},
  removedServers: {},
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: null,
  validationError: null,
  backups: [],
  showBackupPanel: false,
  pendingRestore: null,
  activeScope: "user",
  projectScopes: [],

  setSelectedClient: (clientId) => {
    const client = clientId ? getClientById(clientId) ?? null : null;
    set({ selectedClientId: clientId, selectedClient: client, error: null, activeScope: "user", projectScopes: [] });
    if (clientId) {
      get().loadConfig(clientId);
    }
  },

  setMode: (mode) => {
    const { rawContent, servers, selectedClient, originalContent, activeScope } = get();
    if (mode === "easy") {
      // Edit -> Easy: re-parse rawContent
      try {
        let parsed: Record<string, unknown>;
        if (selectedClient && isSharedConfigFile(selectedClient)) {
          // Raw editor only contains the servers object
          parsed = JSON.parse(rawContent);
        } else {
          parsed = selectedClient
            ? extractServers(rawContent, selectedClient.configKey)
            : {};
        }
        set({ mode, servers: parsed, validationError: null });
      } catch {
        set({ validationError: "Invalid JSON — fix errors before switching to Easy Manage" });
        return;
      }
    } else {
      // Easy -> Edit: serialize servers for raw editor
      if (selectedClient) {
        const effectiveKey = getEffectiveConfigKey(selectedClient, activeScope);
        const content = isSharedConfigFile(selectedClient)
          ? JSON.stringify(servers, null, 2)
          : serversToFullConfig(selectedClient, servers, originalContent, effectiveKey);
        set({ mode, rawContent: content });
      } else {
        set({ mode });
      }
    }
  },

  setRawContent: (content) => {
    let validationError: string | null = null;
    try {
      JSON.parse(content);
    } catch (e) {
      validationError = String(e).replace(/^SyntaxError:\s*/, "");
    }
    set({ rawContent: content, isDirty: true, validationError: content.trim() ? validationError : null });
  },

  loadConfig: async (clientId) => {
    const client = getClientById(clientId);
    if (!client) return;
    if (!client.configPath) {
      set({
        rawContent: "",
        originalContent: "",
        servers: {},
        disabledServers: {},
        removedServers: {},
        isDirty: false,
        isLoading: false,
        error: null,
        validationError: null,
        selectedClient: client,
        selectedClientId: clientId,
        projectScopes: [],
      });
      return;
    }

    // Ensure home dir is resolved for {HOME} placeholder in configKey
    await getHomeDir();

    const { activeScope } = get();
    const effectiveKey = getEffectiveConfigKey(client, activeScope);

    set({ isLoading: true, error: null, validationError: null });

    const loadMtarsierStore = async (clientServers: Record<string, unknown>) => {
      const key = buildStoreKey(clientId, activeScope);
      const store = await invoke<MtarsierStore>("read_mtarsier_store", { storeKey: key })
        .catch(() => ({} as MtarsierStore));

      // Adopt servers in client config not yet in our store
      for (const [name, config] of Object.entries(clientServers)) {
        if (!(name in store)) {
          store[name] = { enabled: true, config: config as Record<string, unknown> };
        }
      }

      // Apply sync rules to existing entries
      for (const [name, entry] of Object.entries(store)) {
        const inClient = name in clientServers;
        if (entry.enabled && !entry.externally_removed && !inClient) {
          store[name] = { ...entry, externally_removed: true };
        } else if (entry.enabled && entry.externally_removed && inClient) {
          store[name] = { ...entry, externally_removed: undefined, config: clientServers[name] as Record<string, unknown> };
        } else if (!entry.enabled && inClient) {
          store[name] = { ...entry, enabled: true };
        }
      }

      await invoke("write_mtarsier_store", { storeKey: key, store }).catch(() => {});

      const servers: Record<string, unknown> = {};
      const disabledServers: Record<string, unknown> = {};
      const removedServers: Record<string, unknown> = {};
      for (const [name, entry] of Object.entries(store)) {
        if (entry.externally_removed) removedServers[name] = entry.config;
        else if (!entry.enabled) disabledServers[name] = entry.config;
        else servers[name] = entry.config;
      }

      set({ servers, disabledServers, removedServers });
    };

    try {
      const content = await invoke<string>("get_client_config", {
        configPath: getEffectiveConfigPath(client),
      });

      let rawServers: Record<string, unknown>;
      let rawContent: string;
      if (client.configFormat === "toml") {
        // Parse TOML on the Rust side; raw editor always shows servers as JSON
        const jsonStr = await invoke<string>("parse_toml_servers", {
          content,
          configKey: client.configKey,
        });
        rawServers = JSON.parse(jsonStr);
        rawContent = JSON.stringify(rawServers, null, 2);
      } else {
        rawServers = extractServers(content, client.configKey, effectiveKey);
        // For shared config files (e.g. Claude Code's ~/.claude.json),
        // only show the MCP servers section in the raw editor
        rawContent = isSharedConfigFile(client)
          ? JSON.stringify(rawServers, null, 2)
          : content;
      }

      // Load project scopes if this client supports them
      let projectScopes: ProjectScope[] = [];
      if (hasScopedConfig(client) && client.configPath) {
        try {
          projectScopes = await invoke<ProjectScope[]>("list_claude_code_scopes", {
            configPath: getEffectiveConfigPath(client),
          });
        } catch {
          // ignore
        }
      }

      set({
        rawContent,
        originalContent: content,
        servers: rawServers,
        disabledServers: {},
        removedServers: {},
        isDirty: false,
        isLoading: false,
        selectedClient: client,
        selectedClientId: clientId,
        projectScopes,
      });

      await loadMtarsierStore(rawServers);
      get().loadBackups();
    } catch {
      // Config file doesn't exist yet — still load mTarsier store so disabled/removed servers surface
      set({
        rawContent: "",
        originalContent: "",
        servers: {},
        disabledServers: {},
        removedServers: {},
        isDirty: false,
        isLoading: false,
        selectedClient: client,
        selectedClientId: clientId,
      });
      await loadMtarsierStore({});
      get().loadBackups();
    }
  },

  saveConfig: async () => {
    const { selectedClient, mode, rawContent, servers, activeScope } = get();
    if (!selectedClient || !selectedClient.configPath) return;

    const effectiveKey = getEffectiveConfigKey(selectedClient, activeScope);

    const saveMtarsierStore = async () => {
      const key = buildStoreKey(selectedClient.id, activeScope);
      // Use get() to read current state — saves in edit mode update servers before this runs
      const { servers: s, disabledServers: ds, removedServers: rs } = get();
      const store: MtarsierStore = {};
      for (const [name, config] of Object.entries(s))
        store[name] = { enabled: true, config: config as Record<string, unknown> };
      for (const [name, config] of Object.entries(ds))
        store[name] = { enabled: false, config: config as Record<string, unknown> };
      for (const [name, config] of Object.entries(rs))
        store[name] = { enabled: true, externally_removed: true, config: config as Record<string, unknown> };
      await invoke("write_mtarsier_store", { storeKey: key, store }).catch(() => {});
    };

    set({ isSaving: true, error: null });
    try {
      // Create backup first if config exists
      try {
        await invoke("create_backup", {
          configPath: getEffectiveConfigPath(selectedClient),
          clientId: selectedClient.id,
        });
      } catch {
        // No existing file to backup — that's fine
      }

      if (mode === "edit") {
        if (isSharedConfigFile(selectedClient)) {
          // Raw editor only has the servers object — use structured write to merge
          const editedServers = JSON.parse(rawContent);
          await invoke("write_client_config", {
            request: {
              config_path: getEffectiveConfigPath(selectedClient),
              config_key: effectiveKey,
              config_format: selectedClient.configFormat,
              servers: editedServers,
            },
          });
          set({
            servers: editedServers,
            isDirty: false,
            isSaving: false,
          });
        } else {
          await invoke("write_raw_config", {
            configPath: getEffectiveConfigPath(selectedClient),
            content: rawContent,
          });
          const newServers = extractServers(rawContent, selectedClient.configKey, effectiveKey);
          set({
            originalContent: rawContent,
            servers: newServers,
            isDirty: false,
            isSaving: false,
          });
        }
      } else {
        await invoke("write_client_config", {
          request: {
            config_path: getEffectiveConfigPath(selectedClient),
            config_key: effectiveKey,
            config_format: selectedClient.configFormat,
            servers,
          },
        });
        const newContent = serversToFullConfig(selectedClient, servers, get().originalContent, effectiveKey);
        set({
          rawContent: isSharedConfigFile(selectedClient)
            ? JSON.stringify(servers, null, 2)
            : newContent,
          originalContent: newContent,
          isDirty: false,
          isSaving: false,
        });
      }
      await saveMtarsierStore();
      get().loadBackups();
      useClientStore.getState().detectAll();
    } catch (err) {
      set({ error: String(err), isSaving: false });
    }
  },

  formatJson: () => {
    const { rawContent } = get();
    try {
      const parsed = JSON.parse(rawContent);
      const formatted = JSON.stringify(parsed, null, 2);
      set({ rawContent: formatted, validationError: null });
    } catch (e) {
      set({ validationError: String(e) });
    }
  },

  validateContent: async () => {
    const { rawContent } = get();
    try {
      await invoke("validate_config", {
        content: rawContent,
        format: "json", // rawContent is always JSON (TOML clients are pre-converted on load)
      });
      set({ validationError: null });
    } catch (err) {
      set({ validationError: String(err) });
    }
  },

  loadBackups: async () => {
    const { selectedClientId } = get();
    if (!selectedClientId) return;
    try {
      const backups = await invoke<BackupEntry[]>("list_backups", {
        clientId: selectedClientId,
      });
      set({ backups });
    } catch {
      set({ backups: [] });
    }
  },

  restoreBackup: async (filename) => {
    const { selectedClient } = get();
    if (!selectedClient || !selectedClient.configPath) return;

    try {
      await invoke("restore_backup", {
        clientId: selectedClient.id,
        filename,
        configPath: getEffectiveConfigPath(selectedClient),
      });
      await get().loadConfig(selectedClient.id);
    } catch (err) {
      set({ error: String(err) });
    }
  },

  previewRestore: async (filename) => {
    const { selectedClient, servers, disabledServers, activeScope, backups } = get();
    if (!selectedClient || !selectedClient.configPath) return;

    const effectiveKey = getEffectiveConfigKey(selectedClient, activeScope);
    const entry = backups.find((b) => b.filename === filename);

    try {
      const content = await invoke<string>("read_backup", {
        clientId: selectedClient.id,
        filename,
      });
      let backupServers: Record<string, unknown>;
      if (selectedClient.configFormat === "toml") {
        const jsonStr = await invoke<string>("parse_toml_servers", {
          content,
          configKey: selectedClient.configKey,
        });
        backupServers = JSON.parse(jsonStr);
      } else {
        backupServers = extractServers(content, selectedClient.configKey, effectiveKey);
      }

      // Include disabled servers in "current" so they don't show as added/removed in the diff
      const allCurrentServers = { ...servers, ...disabledServers };
      const currentKeys = new Set(Object.keys(allCurrentServers));
      const backupKeys = new Set(Object.keys(backupServers));

      const diff: RestoreDiff = {
        added: [...backupKeys].filter((k) => !currentKeys.has(k)),
        removed: [...currentKeys].filter((k) => !backupKeys.has(k)),
        changed: [...backupKeys].filter(
          (k) =>
            currentKeys.has(k) &&
            JSON.stringify(allCurrentServers[k]) !== JSON.stringify(backupServers[k])
        ),
        unchanged: [...backupKeys].filter(
          (k) =>
            currentKeys.has(k) &&
            JSON.stringify(allCurrentServers[k]) === JSON.stringify(backupServers[k])
        ),
      };

      set({
        pendingRestore: {
          filename,
          timestamp: entry?.timestamp ?? filename,
          diff,
        },
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  confirmRestore: async () => {
    const { pendingRestore } = get();
    if (!pendingRestore) return;
    set({ pendingRestore: null });
    await get().restoreBackup(pendingRestore.filename);
  },

  cancelRestore: () => set({ pendingRestore: null }),

  deleteBackup: async (filename) => {
    const { selectedClientId } = get();
    if (!selectedClientId) return;
    try {
      await invoke("delete_backup", {
        clientId: selectedClientId,
        filename,
      });
      get().loadBackups();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleBackupPanel: () => {
    const { showBackupPanel } = get();
    set({ showBackupPanel: !showBackupPanel });
    if (!showBackupPanel) {
      get().loadBackups();
    }
  },

  addServer: (name, data) => {
    const { servers, disabledServers, removedServers } = get();
    // If this name exists in disabled/removed, promote it to active (import / re-add takes precedence)
    const newDisabled = { ...disabledServers };
    const newRemoved = { ...removedServers };
    delete newDisabled[name];
    delete newRemoved[name];
    set({
      servers: { ...servers, [name]: data },
      disabledServers: newDisabled,
      removedServers: newRemoved,
      isDirty: true,
    });
  },

  updateServer: (name, data) => {
    const { servers, disabledServers } = get();
    if (name in disabledServers) {
      set({ disabledServers: { ...disabledServers, [name]: data }, isDirty: true });
    } else {
      set({ servers: { ...servers, [name]: data }, isDirty: true });
    }
  },

  removeServer: (name) => {
    const { servers, disabledServers } = get();
    const newServers = { ...servers };
    const newDisabled = { ...disabledServers };
    delete newServers[name];
    delete newDisabled[name];
    set({ servers: newServers, disabledServers: newDisabled, isDirty: true });
  },

  toggleServer: (name) => {
    const { servers, disabledServers } = get();
    if (name in servers) {
      const { [name]: entry, ...rest } = servers as Record<string, unknown>;
      set({ servers: rest, disabledServers: { ...disabledServers, [name]: entry }, isDirty: true });
    } else if (name in disabledServers) {
      const { [name]: entry, ...rest } = disabledServers as Record<string, unknown>;
      set({ servers: { ...servers, [name]: entry }, disabledServers: rest, isDirty: true });
    }
  },

  restoreRemovedServer: (name) => {
    const { servers, removedServers } = get();
    const { [name]: entry, ...rest } = removedServers as Record<string, unknown>;
    set({ servers: { ...servers, [name]: entry }, removedServers: rest, isDirty: true });
  },

  dismissRemovedServer: (name) => {
    const { removedServers } = get();
    const { [name]: _dropped, ...rest } = removedServers as Record<string, unknown>;
    set({ removedServers: rest, isDirty: true });
  },

  createDefaultConfig: async () => {
    const { selectedClient, activeScope } = get();
    if (!selectedClient || !selectedClient.configPath) return;

    const effectiveKey = getEffectiveConfigKey(selectedClient, activeScope);

    set({ isLoading: true, error: null });
    try {
      const content = await invoke<string>("create_default_config", {
        configPath: getEffectiveConfigPath(selectedClient),
        configKey: effectiveKey,
        configFormat: selectedClient.configFormat,
      });
      set({
        rawContent: isSharedConfigFile(selectedClient)
          ? JSON.stringify({}, null, 2)
          : content,
        originalContent: content,
        servers: {},
        isDirty: false,
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  setScope: (scope) => {
    const { selectedClientId } = get();
    set({ activeScope: scope });
    if (selectedClientId) {
      get().loadConfig(selectedClientId);
    }
  },
}));
