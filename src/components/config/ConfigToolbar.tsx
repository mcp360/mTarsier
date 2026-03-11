import { useConfigStore } from "../../store/configStore";
import ModeSwitcher from "./ModeSwitcher";
import ScopeSelector from "./ScopeSelector";

function ConfigToolbar() {
  const {
    selectedClient,
    mode,
    isDirty,
    isSaving,
    saveConfig,
    formatJson,
    toggleBackupPanel,
    showBackupPanel,
  } = useConfigStore();

  // In easy mode, EasyModeEditor handles auto-save — no manual Save needed here.

  if (!selectedClient) return null;

  const showScope = !!selectedClient.supportsScopes;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-base-light/50 gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold flex-shrink-0">{selectedClient.name}</h2>
          {showScope && <ScopeSelector />}
        </div>
        <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">
          {selectedClient.configPath}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ModeSwitcher />
        {mode === "edit" && (
          <>
            <button
              onClick={formatJson}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors"
            >
              Format
            </button>
          </>
        )}
        <button
          onClick={toggleBackupPanel}
          className={`px-2.5 py-1.5 text-xs border rounded-md transition-colors ${
            showBackupPanel
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-text-muted hover:text-text bg-surface hover:bg-surface-hover border-border"
          }`}
        >
          Backups
        </button>
        {mode !== "easy" && (
          <button
            onClick={saveConfig}
            disabled={isSaving || !isDirty}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              isDirty
                ? "bg-primary text-base hover:bg-primary-dim"
                : "bg-surface text-text-muted border border-border cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Save"}
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-base" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default ConfigToolbar;
