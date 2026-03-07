export type TransportType = "stdio" | "sse" | "streamable-http" | "remote-mcp";

export interface McpServerFormData {
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface BackupEntry {
  filename: string;
  timestamp: string;
  size_bytes: number;
}

export interface RestoreDiff {
  added: string[];    // in backup, not in current → will come back
  removed: string[];  // in current, not in backup → will be gone
  changed: string[];  // in both but config differs → will revert
  unchanged: string[]; // identical in both
}

export interface PendingRestore {
  filename: string;
  timestamp: string;
  diff: RestoreDiff;
}

export interface WriteConfigRequest {
  config_path: string;
  config_key: string;
  config_format: string;
  servers: Record<string, unknown>;
}
