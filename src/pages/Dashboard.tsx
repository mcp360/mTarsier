import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClientStore } from "../store/clientStore";
import { useAuditStore } from "../store/auditStore";
import { useClientDetection } from "../hooks/useClientDetection";
import type { ClientType } from "../types/client";

const CLIENT_TYPES: ClientType[] = ["Desktop", "IDE", "CLI", "Web", "Framework"];

const TYPE_COLORS: Record<ClientType, { badge: string; dot: string }> = {
  Desktop: { badge: "bg-surface-overlay text-text-muted", dot: "bg-text-muted/50" },
  IDE: { badge: "bg-surface-overlay text-text-muted", dot: "bg-text-muted/50" },
  CLI: { badge: "bg-surface-overlay text-text-muted", dot: "bg-text-muted/50" },
  Web: { badge: "bg-surface-overlay text-text-muted", dot: "bg-text-muted/50" },
  Framework: { badge: "bg-surface-overlay text-text-muted", dot: "bg-text-muted/50" },
};

const ACTION_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  config_write: { label: "Config Updated", color: "text-primary", dot: "bg-primary" },
  config_write_raw: { label: "Config Edited (Raw)", color: "text-primary", dot: "bg-primary" },
  config_create: { label: "Config Created", color: "text-primary", dot: "bg-primary" },
  backup_create: { label: "Backup Created", color: "text-primary", dot: "bg-primary" },
  backup_restore: { label: "Backup Restored", color: "text-primary", dot: "bg-primary" },
  backup_delete: { label: "Backup Deleted", color: "text-red-400", dot: "bg-red-400" },
  server_add: { label: "Server Added", color: "text-primary", dot: "bg-primary" },
  server_remove: { label: "Server Removed", color: "text-red-400", dot: "bg-red-400" },
};

function formatRelativeTime(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays} days ago`;
  } catch {
    return iso;
  }
}

function Dashboard() {
  const navigate = useNavigate();
  useClientDetection();

  const { clients, isDetecting } = useClientStore();
  const { entries, loadLogs } = useAuditStore();

  useEffect(() => {
    loadLogs();
  }, []);

  const installedClients = useMemo(
    () => clients.filter((c) => c.installed),
    [clients],
  );

  const detectableCount = useMemo(
    () => clients.filter((c) => c.meta.detection.kind !== "none").length,
    [clients],
  );

  const totalServers = useMemo(
    () => installedClients.reduce((sum, c) => sum + (c.serverCount ?? 0), 0),
    [installedClients],
  );

  const configuredClients = useMemo(
    () => clients.filter((c) => c.configExists).length,
    [clients],
  );

  const recentChanges = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.timestamp).getTime() > weekAgo).length;
  }, [entries]);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const clientsByType = useMemo(() => {
    const map: Record<ClientType, typeof clients> = {
      Desktop: [], IDE: [], CLI: [], Web: [], Framework: [],
    };
    for (const c of clients) map[c.meta.type].push(c);
    return map;
  }, [clients]);

  const loading = isDetecting;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-text-muted">
          At-a-glance view of your MCP ecosystem.
        </p>
      </div>

      <div className="flex-1 space-y-6 px-6 pb-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Installed Clients" value={loading ? "--" : `${installedClients.length}/${detectableCount}`} />
          <StatCard label="MCP Servers" value={loading ? "--" : String(totalServers)} />
          <StatCard label="Configured" value={loading ? "--" : String(configuredClients)} />
          <StatCard label="Recent Changes" value={String(recentChanges)} sub="last 7 days" />
        </div>

        {/* Client Breakdown by Type */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Clients by Type</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {CLIENT_TYPES.map((type) => {
              const all = clientsByType[type];
              const installed = all.filter((c) => c.installed);
              const colors = TYPE_COLORS[type];
              return (
                <div
                  key={type}
                  className="rounded-lg border border-border-hover bg-surface p-4 min-h-[96px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${colors.badge}`}>
                      {type}
                    </span>
                    <span className="text-xs text-text-muted">
                      {installed.length}/{all.length} installed
                    </span>
                  </div>
                  {installed.length === 0 ? (
                    <p className="text-xs text-text-muted/60">No installed clients</p>
                  ) : (
                    <div className="space-y-1.5">
                      {installed.map((c) => (
                        <button
                          key={c.meta.id}
                          onClick={() => {
                            if (c.meta.configPath) navigate(`/config?client=${c.meta.id}`);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                            c.meta.configPath
                              ? "hover:bg-surface-overlay cursor-pointer"
                              : "cursor-default"
                          }`}
                        >
                          <span className="text-text truncate">{c.meta.name}</span>
                          {c.serverCount !== null && (
                            <span className="ml-2 flex-shrink-0 text-[10px] text-text-muted">
                              {c.serverCount} server{c.serverCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted">Recent Activity</h2>
            <button
              onClick={() => navigate("/audit")}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </button>
          </div>

          {recentEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border-hover bg-surface py-12 text-text-muted">
              <svg className="mb-2 h-8 w-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xs">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => {
                const meta = ACTION_LABELS[entry.action] ?? {
                  label: entry.action,
                  color: "text-text-muted",
                  dot: "bg-text-muted",
                };
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-border-hover bg-surface px-3 py-2.5"
                  >
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        {entry.client_name && (
                          <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-muted border border-border">
                            {entry.client_name}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted truncate">
                        {entry.detail}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-text-muted/60 whitespace-nowrap">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border-hover bg-surface p-5">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text">{value}</p>
      {sub && <p className="mt-1 text-[10px] text-text-muted/60">{sub}</p>}
    </div>
  );
}

export default Dashboard;
