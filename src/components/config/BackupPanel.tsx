import { useConfigStore } from "../../store/configStore";
import BackupItem from "./BackupItem";
import RestoreConfirmDialog from "./RestoreConfirmDialog";

function BackupPanel() {
  const { backups, previewRestore, deleteBackup, toggleBackupPanel } = useConfigStore();

  return (
    <>
      <RestoreConfirmDialog />
      <div className="w-72 flex-shrink-0 border-l border-border flex flex-col h-full bg-base-light/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Backups
          </h3>
          <button
            onClick={toggleBackupPanel}
            className="text-text-muted hover:text-text rounded p-0.5 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {backups.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No backups yet</p>
          ) : (
            <div className="space-y-0.5">
              {backups.map((b) => (
                <BackupItem
                  key={b.filename}
                  backup={b}
                  onRestore={() => previewRestore(b.filename)}
                  onDelete={() => deleteBackup(b.filename)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default BackupPanel;
