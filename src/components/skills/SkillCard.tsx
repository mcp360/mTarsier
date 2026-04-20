import { Trash2, Copy, FolderOpen, Eye, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFavoritesStore } from "../../store/skillStore";
import type { InstalledSkill } from "../../store/skillStore";
import { ClientLogo } from "./ClientLogo";

interface Props {
  skill: InstalledSkill;
  clientName?: string;
  clientId?: string;
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
  clientName,
  clientId,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onOpenInFinder,
  onView,
  onCopyTo,
  onDelete,
}: Props) {
  const { toggle, isFavorite } = useFavoritesStore();
  const favorited = isFavorite(skill.path);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-surface flex flex-col transition-all overflow-hidden",
        selectionMode
          ? selected
            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 cursor-pointer"
            : "border-border hover:border-border-hover cursor-pointer"
          : "border-border hover:border-border-hover hover:shadow-sm"
      )}
      onClick={selectionMode ? onToggleSelect : undefined}
    >
      {/* Client tab badge */}
      {clientName && (
        <div className="flex">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-overlay border-b border-r border-border rounded-br-2xl">
            <ClientLogo clientId={clientId ?? ""} clientName={clientName} size={16} />
            <span className="text-[11px] font-semibold text-text tracking-tight">{clientName}</span>
          </div>
        </div>
      )}

      {/* Top row: icon + name + star */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {selectionMode ? (
          <div
            className={cn(
              "flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
              selected ? "bg-primary border-primary" : "border-border group-hover:border-primary/40"
            )}
          >
            {selected && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ) : (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-text truncate leading-snug">{skill.name}</span>
            {skill.version && (
              <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-surface-overlay border border-border text-text-muted font-mono leading-none">
                v{skill.version}
              </span>
            )}
          </div>
        </div>

        {!selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); toggle(skill.path); }}
            className={cn(
              "flex-shrink-0 p-1 rounded transition-colors cursor-pointer",
              favorited
                ? "text-yellow-400"
                : "text-text-muted/30 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
            )}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={13} fill={favorited ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Description */}
      <div className="px-4 pb-3 flex-1">
        {skill.description ? (
          <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">{skill.description}</p>
        ) : (
          <p className="text-[11px] text-text-muted/30 italic">No description</p>
        )}
      </div>

      {/* Footer: path + actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenInFinder(skill); }}
          className="inline-flex items-center gap-1 text-[10px] text-text-muted/50 hover:text-text-muted font-mono transition-colors truncate min-w-0 cursor-pointer"
          title={skill.path}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="truncate">{skill.path.split("/").slice(-2).join("/")}</span>
        </button>

        {!selectionMode && (
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onView(skill); }}
              className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              title="View skill"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenInFinder(skill); }}
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer"
              title="Open in Finder"
            >
              <FolderOpen size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCopyTo(skill); }}
              className="p-1.5 rounded text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors cursor-pointer"
              title="Copy to other clients"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(skill); }}
              className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
              title="Delete skill"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
