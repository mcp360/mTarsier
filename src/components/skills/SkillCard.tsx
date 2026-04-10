import { Trash2, Copy, FolderOpen, Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import type { InstalledSkill } from "../../store/skillStore";

interface Props {
  skill: InstalledSkill;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpenInFinder: (skill: InstalledSkill) => void;
  onView: (skill: InstalledSkill) => void;
  onCopyTo: (skill: InstalledSkill) => void;
  onDelete: (skill: InstalledSkill) => void;
}

export default function SkillCard({
  skill,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onOpenInFinder,
  onView,
  onCopyTo,
  onDelete,
}: Props) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-surface p-4 flex flex-col gap-2 transition-all",
        selectionMode
          ? selected
            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
            : "border-border hover:border-border-hover cursor-pointer"
          : "border-border hover:border-border-hover"
      )}
      onClick={selectionMode ? onToggleSelect : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {selectionMode ? (
            <div
              className={cn(
                "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                selected
                  ? "bg-primary border-primary"
                  : "border-border group-hover:border-primary/40"
              )}
            >
              {selected && (
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          )}
          <span className="text-xs font-semibold text-text truncate">{skill.name}</span>
        </div>
        {!selectionMode && (
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(skill);
              }}
              className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
              title="View skill"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInFinder(skill);
              }}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-overlay transition-colors"
              title="Open in Finder"
            >
              <FolderOpen size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyTo(skill);
              }}
              className="p-1 rounded text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
              title="Copy to other clients"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(skill);
              }}
              className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete skill"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[2.5rem] flex items-start">
        {skill.description ? (
          <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
            {skill.description}
          </p>
        ) : (
          <p className="text-[11px] text-text-muted/40 italic">No description</p>
        )}
      </div>

      <div className="mt-auto pt-1">
        <button
          onClick={() => onOpenInFinder(skill)}
          className="inline-flex items-center gap-1 text-[10px] text-text-muted/60 hover:text-text-muted font-mono transition-colors"
          title="Open folder"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {skill.path.split("/").slice(-2).join("/")}
        </button>
      </div>
    </div>
  );
}
