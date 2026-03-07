import type { BackupEntry } from "../../types/config";

interface Props {
  backup: BackupEntry;
  onRestore: () => void;
  onDelete: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function BackupItem({ backup, onRestore, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-surface-hover">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono text-text truncate">{backup.timestamp}</p>
        <p className="text-[10px] text-text-muted">{formatSize(backup.size_bytes)}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={onRestore}
          className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
        >
          Restore
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default BackupItem;
