import { useConfigStore } from "../../store/configStore";
import BackupItem from "./BackupItem";
import RestoreConfirmDialog from "./RestoreConfirmDialog";

function BackupPanel() {
  const { backups, previewRestore, deleteBackup } = useConfigStore();

  return (
    <>
      <RestoreConfirmDialog />
      <div className="w-72 flex-shrink-0 border-l border-border flex flex-col h-full bg-base-light/30">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Backups
          </h3>
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
