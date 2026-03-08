import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ClientState } from "../types/client";

function extractServerIds(content: string, configKey: string): string[] {
  try {
    const json = JSON.parse(content);
    const keys = configKey.split(".");
    let current: unknown = json;
    for (const key of keys) {
      if (current && typeof current === "object" && key in (current as object)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return [];
      }
    }
    return current && typeof current === "object" && !Array.isArray(current)
      ? Object.keys(current as object)
      : [];
  } catch {
    return [];
  }
}

/**
 * Reads all installed client configs and returns a map of
 * serverId → array of client display names that have it installed.
 */
export function useMarketplaceInstalls(clients: ClientState[], refreshKey: number): Map<string, string[]> {
  const [installMap, setInstallMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    const configurable = clients.filter(
      (cs) => cs.meta.configPath !== null && cs.installed
    );
    if (configurable.length === 0) {
      setInstallMap(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      const map = new Map<string, string[]>();

      // Resolve home dir once for Claude Code local-scope configs
      let homeDir = "";
      const hasScoped = configurable.some((cs) => cs.meta.supportsScopes);
      if (hasScoped) {
        try {
          homeDir = await invoke<string>("get_home_dir");
        } catch {
          // fall through — local scope simply won't resolve
        }
      }

      for (const cs of configurable) {
        try {
          const content = await invoke<string>("get_client_config", {
            configPath: cs.meta.configPath,
          });

          let serverIds: string[];

          if (cs.meta.configFormat === "toml") {
            const jsonStr = await invoke<string>("parse_toml_servers", {
              content,
              configKey: cs.meta.configKey,
            });
            serverIds = Object.keys(JSON.parse(jsonStr) as object);
          } else if (cs.meta.supportsScopes) {
            // Claude Code: check user scope AND local scope
            const userIds = extractServerIds(content, "mcpServers");
            const resolvedKey = cs.meta.configKey.replace("{HOME}", homeDir);
            const localIds = extractServerIds(content, resolvedKey);
            serverIds = [...new Set([...userIds, ...localIds])];
          } else {
            serverIds = extractServerIds(content, cs.meta.configKey);
          }

          for (const id of serverIds) {
            const existing = map.get(id) ?? [];
            existing.push(cs.meta.name);
            map.set(id, existing);
          }
        } catch {
          // Config doesn't exist or isn't readable — skip
        }
      }

      if (!cancelled) setInstallMap(map);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clients, refreshKey]);

  return installMap;
}
