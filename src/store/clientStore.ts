import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { CLIENT_REGISTRY } from "../lib/clients";
import type { ClientState, ClientType, DetectionRequest, DetectionResult } from "../types/client";

interface ClientStore {
  clients: ClientState[];
  filter: ClientType | "All";
  isDetecting: boolean;
  selectedClientId: string | null;
  platform: string | null;
  setFilter: (filter: ClientType | "All") => void;
  selectClient: (id: string | null) => void;
  detectAll: () => Promise<void>;
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: CLIENT_REGISTRY.map((meta) => ({
    meta,
    installed: false,
    configExists: false,
    serverCount: null,
  })),
  filter: "All",
  isDetecting: false,
  selectedClientId: null,
  platform: null,

  setFilter: (filter) => set({ filter }),
  selectClient: (id) => set({ selectedClientId: id }),

  detectAll: async () => {
    if (get().isDetecting) return;
    set({ isDetecting: true });
    const platform = get().platform ?? await invoke<string>("get_platform").catch(() => null);
    if (platform && !get().platform) {
      set({
        platform,
        // On Linux, replace skillsPath with the Linux-specific path where defined.
        clients: get().clients.map((cs) =>
          platform === "linux" && cs.meta.skillsPathLinux
            ? { ...cs, meta: { ...cs.meta, skillsPath: cs.meta.skillsPathLinux } }
            : cs
        ),
      });
    }
    try {
      const requests: DetectionRequest[] = CLIENT_REGISTRY.filter(
        (c) => c.detection.kind !== "none"
      ).map((c) => ({
        client_id: c.id,
        detection_kind: c.detection.kind,
        detection_value:
          c.detection.kind === "app_bundle"
            ? c.detection.path
            : c.detection.kind === "cli_binary"
              ? c.detection.name
              : c.detection.kind === "vscode_extension"
                ? c.detection.id
                : undefined,
        detection_value_win:
          c.detection.kind === "app_bundle" ? c.detection.pathWin : undefined,
        detection_value_linux:
          c.detection.kind === "app_bundle" ? c.detection.pathLinux : undefined,
        config_path: c.configPath,
        config_path_win: c.configPathWin,
        config_path_linux: c.configPathLinux,
        config_key: c.configKey,
      }));

      const results = await invoke<DetectionResult[]>("detect_installed_clients", {
        clients: requests,
      });

      const resultMap = new Map(results.map((r) => [r.client_id, r]));
      set({
        clients: get().clients.map((cs) => {
          const result = resultMap.get(cs.meta.id);
          if (result) {
            return {
              ...cs,
              installed: result.installed,
              configExists: result.config_exists,
              serverCount: result.server_count ?? null,
            };
          }
          return cs;
        }),
      });
    } catch (err) {
      console.error("Detection failed:", err);
    } finally {
      set({ isDetecting: false });
    }
  },
}));
