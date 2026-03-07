import { useEffect, useMemo } from "react";
import { useAuditStore } from "../store/auditStore";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  config_write: { label: "Config Updated", color: "text-primary" },
  config_write_raw: { label: "Config Edited (Raw)", color: "text-primary" },
  config_create: { label: "Config Created", color: "text-primary" },
  backup_create: { label: "Backup Created", color: "text-primary" },
  backup_restore: { label: "Backup Restored", color: "text-primary" },
  backup_delete: { label: "Backup Deleted", color: "text-red-400" },
  server_add: { label: "Server Added", color: "text-primary" },
  server_remove: { label: "Server Removed", color: "text-red-400" },
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AuditLogs() {
  const {
    entries,
    isLoading,
    filterAction,
    filterClient,
    loadLogs,
    clearLogs,
    exportLogs,
    setFilterAction,
    setFilterClient,
  } = useAuditStore();

  useEffect(() => {
    loadLogs();
  }, []);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.client_id) set.add(e.client_id);
    }
    return Array.from(set);
  }, [entries]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      set.add(e.action);
    }
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterAction !== "all" && e.action !== filterAction) return false;
      if (filterClient !== "all" && e.client_id !== filterClient) return false;
      return true;
    });
  }, [entries, filterAction, filterClient]);

  const handleExport = async () => {
    try {
      const json = await exportLogs();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mtarsier-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="mt-1 text-text-muted">
          Track all configuration changes, backups, and server modifications.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 pb-4 flex-wrap">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]?.label ?? a}
            </option>
          ))}
        </select>

        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
        >
          <option value="all">All Clients</option>
          {uniqueClients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:text-text hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export JSON
        </button>

        <button
          onClick={() => loadLogs()}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:text-text hover:border-primary/50 transition-colors"
        >
          Refresh
        </button>

        <button
          onClick={clearLogs}
          disabled={entries.length === 0}
          className="rounded-lg border border-red-400/30 bg-surface px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
      </div>

      {/* Log entries */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-text-muted">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading audit logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-text-muted">
            <svg className="w-12 h-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No audit entries yet</p>
            <p className="text-xs mt-1 opacity-60">
              Changes to configs and backups will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const meta = ACTION_LABELS[entry.action] ?? {
                label: entry.action,
                color: "text-text-muted",
              };
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-surface p-3 hover:border-border-hover transition-colors"
                >
                  {/* Action dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        meta.color === "text-primary" ? "bg-primary" : "bg-red-400"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                      {entry.client_id && (
                        <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-muted border border-border">
                          {entry.client_name ?? entry.client_id}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted truncate">
                      {entry.detail}
                    </p>
                    {entry.config_path && (
                      <p className="mt-0.5 text-[10px] text-text-muted/60 font-mono truncate">
                        {entry.config_path}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-[10px] text-text-muted/60 whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!isLoading && entries.length > 0 && (
        <div className="px-6 py-2 border-t border-border">
          <p className="text-[10px] text-text-muted">
            Showing {filtered.length} of {entries.length} entries
          </p>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
