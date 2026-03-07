import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../../store/configStore";
import ServerCard from "./ServerCard";
import AddServerDialog from "./AddServerDialog";
import EditServerDialog from "./EditServerDialog";
import ImportDialog from "./ImportDialog";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function EasyModeEditor() {
  const { servers, selectedClient, addServer, removeServer, updateServer, saveConfig } =
    useConfigStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "saving" | "done">("idle");

  const serverEntries = Object.entries(servers);

  async function autoSave() {
    setSaveStatus("saving");
    try {
      await saveConfig();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const handleAdd = async (name: string, data: Record<string, unknown>) => {
    addServer(name, data);
    setShowAddDialog(false);
    await autoSave();
  };

  const handleUpdate = async (name: string, data: Record<string, unknown>) => {
    updateServer(name, data);
    setEditingServer(null);
    await autoSave();
  };

  const handleDelete = async (name: string) => {
    removeServer(name);
    await autoSave();
  };

  async function handleExport() {
    if (!selectedClient || serverEntries.length === 0) return;
    const content = JSON.stringify({ version: 1, servers }, null, 2);
    const filename = `${selectedClient.name.toLowerCase().replace(/\s+/g, "-")}-servers.tsr`;
    setExportStatus("saving");
    try {
      const saved = await invoke<boolean>("export_tsr", { content, filename });
      if (saved) {
        setExportStatus("done");
        setTimeout(() => setExportStatus("idle"), 2000);
      } else {
        setExportStatus("idle");
      }
    } catch {
      setExportStatus("idle");
    }
  }

  const saveIndicator = () => {
    if (saveStatus === "saving") {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/50 animate-pulse" />
          Saving…
        </span>
      );
    }
    if (saveStatus === "saved") {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-primary/80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
          Saved
        </span>
      );
    }
    if (saveStatus === "error") {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Save failed
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {serverEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center gap-3">
          <p className="text-text-muted text-sm">No MCP servers configured</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-4 py-2 text-xs font-medium text-text-muted border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
            >
              + Add Server
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Toolbar row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted border border-border rounded-md hover:bg-surface-hover hover:text-text transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M8 1a.75.75 0 0 1 .75.75v6.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L7.25 8.44V1.75A.75.75 0 0 1 8 1ZM2.75 14a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
                  </svg>
                  Import
                </button>
                <button
                  onClick={handleExport}
                  disabled={exportStatus !== "idle"}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted border border-border rounded-md hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-60"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M8 15a.75.75 0 0 1-.75-.75V7.56L5.03 9.78a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L8.75 7.56v6.69A.75.75 0 0 1 8 15ZM2.75 1a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
                  </svg>
                  {exportStatus === "done" ? "Exported!" : exportStatus === "saving" ? "Saving…" : "Export"}
                </button>
              </div>
              {saveIndicator()}
            </div>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 transition-colors"
            >
              + Add Server
            </button>
          </div>

          {serverEntries.map(([name, data]) => (
            <ServerCard
              key={name}
              name={name}
              data={data as Record<string, unknown>}
              onEdit={() => setEditingServer(name)}
              onDelete={() => handleDelete(name)}
            />
          ))}

          <button
            onClick={() => setShowAddDialog(true)}
            className="w-full py-2.5 text-xs text-primary/70 hover:text-primary border border-dashed border-border hover:border-primary/30 rounded-lg transition-colors"
          >
            + Add Server
          </button>
        </div>
      )}

      {showAddDialog && (
        <AddServerDialog
          supportedTransports={selectedClient?.supportedTransports ?? []}
          onAdd={handleAdd}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {showImportDialog && (
        <ImportDialog
          onClose={() => setShowImportDialog(false)}
          onImported={autoSave}
        />
      )}

      {editingServer && (
        <EditServerDialog
          name={editingServer}
          data={servers[editingServer] as Record<string, unknown>}
          supportedTransports={selectedClient?.supportedTransports ?? []}
          onSave={handleUpdate}
          onClose={() => setEditingServer(null)}
        />
      )}
    </div>
  );
}

export default EasyModeEditor;
