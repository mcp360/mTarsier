import { useConfigStore } from "../../store/configStore";
import { cn } from "../../lib/utils";

function RestoreConfirmDialog() {
  const { pendingRestore, confirmRestore, cancelRestore } = useConfigStore();
  if (!pendingRestore) return null;

  const { timestamp, diff } = pendingRestore;
  const hasChanges =
    diff.added.length + diff.removed.length + diff.changed.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl mx-4">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Restore backup?</h2>
          <p className="mt-0.5 text-[11px] text-text-muted font-mono">{timestamp}</p>
        </div>

        {/* Diff body */}
        <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
          {!hasChanges ? (
            <p className="text-xs text-text-muted">
              This backup is identical to your current config. Nothing will change.
            </p>
          ) : (
            <>
              {diff.added.length > 0 && (
                <DiffSection
                  label="Will be added"
                  items={diff.added}
                  color="text-primary"
                  prefix="+"
                />
              )}
              {diff.removed.length > 0 && (
                <DiffSection
                  label="Will be removed"
                  items={diff.removed}
                  color="text-red-400"
                  prefix="−"
                />
              )}
              {diff.changed.length > 0 && (
                <DiffSection
                  label="Will revert to older config"
                  items={diff.changed}
                  color="text-amber"
                  prefix="~"
                />
              )}
              {diff.unchanged.length > 0 && (
                <p className="text-[11px] text-text-muted">
                  {diff.unchanged.length} server{diff.unchanged.length !== 1 ? "s" : ""} unchanged
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={cancelRestore}
            className="px-4 py-1.5 text-xs rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmRestore}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffSection({
  label,
  items,
  color,
  prefix,
}: {
  label: string;
  items: string[];
  color: string;
  prefix: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label} ({items.length})
      </p>
      <ul className="space-y-0.5">
        {items.map((name) => (
          <li key={name} className="flex items-center gap-2">
            <span className={cn("text-[11px] font-bold w-3 shrink-0", color)}>{prefix}</span>
            <span className={cn("text-xs font-mono", color)}>{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RestoreConfirmDialog;
