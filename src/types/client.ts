export type ClientType = "Desktop" | "IDE" | "Web" | "CLI" | "Framework";

export type DetectionMethod =
  | { kind: "app_bundle"; path: string }
  | { kind: "cli_binary"; name: string }
  | { kind: "vscode_extension"; id: string }
  | { kind: "none" };

import type { TransportType } from "./config";

export interface ClientMeta {
  id: string;
  name: string;
  type: ClientType;
  docsUrl: string;
  configPath: string | null;
  configPathWin: string | null;
  configPathLinux: string | null;
  configKey: string;
  configFormat: "json" | "yaml" | "toml";
  detection: DetectionMethod;
  supportedTransports: TransportType[];
  /** True when the config file contains non-MCP data (e.g. ~/.claude.json).
   *  The editor will only show the MCP servers section, not the full file. */
  isSharedFile?: boolean;
  /** True when the client supports user/local/per-project scope selection (Claude Code only). */
  supportsScopes?: boolean;
  /** Step-by-step guide shown for web/remote clients that have no local config. */
  setupSteps?: Array<{ text: string; note?: string }>;
}

export interface ClientState {
  meta: ClientMeta;
  installed: boolean;
  configExists: boolean;
  serverCount: number | null;
}

export interface DetectionRequest {
  client_id: string;
  detection_kind: string;
  detection_value?: string;
  config_path: string | null;
  config_key: string | null;
}

export interface DetectionResult {
  client_id: string;
  installed: boolean;
  config_exists: boolean;
  server_count: number | null;
}

export interface McpServer {
  name: string;
  command: string | null;
  args: string[] | null;
  env: Record<string, string> | null;
  url: string | null;
}
