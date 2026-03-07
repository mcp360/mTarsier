import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { McpServer } from "../../types/client";

function McpServerList({ configPath, configKey, configFormat }: { configPath: string; configKey: string; configFormat?: string }) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<McpServer[]>("read_mcp_servers", {
      configPath,
      configKey,
      configFormat: configFormat ?? "json",
    })
      .then(setServers)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [configPath, configKey, configFormat]);

  if (loading) {
    return <p className="text-sm text-text-muted">Loading servers...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">Error: {error}</p>;
  }

  if (servers.length === 0) {
    return <p className="text-sm text-text-muted">No MCP servers configured</p>;
  }

  return (
    <div className="space-y-2">
      {servers.map((server) => (
        <div key={server.name} className="rounded-lg border border-border bg-base-light p-3">
          <p className="font-mono text-sm font-medium text-text">{server.name}</p>
          {server.command && (
            <p className="mt-1 truncate font-mono text-xs text-text-muted">
              {server.command}
              {server.args?.length ? ` ${server.args.join(" ")}` : ""}
            </p>
          )}
          {server.url && (
            <p className="mt-1 truncate font-mono text-xs text-text-muted">{server.url}</p>
          )}
          {server.env && Object.keys(server.env).length > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {Object.keys(server.env).length} env var{Object.keys(server.env).length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default McpServerList;
