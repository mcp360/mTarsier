import { Trash2, Copy, FolderOpen } from "lucide-react";
import type { InstalledSkill } from "../../store/skillStore";

interface Props {
  skill: InstalledSkill;
  onOpenInFinder: (skill: InstalledSkill) => void;
  onCopyTo: (skill: InstalledSkill) => void;
  onDelete: (skill: InstalledSkill) => void;
}

export default function SkillCard({ skill, onOpenInFinder, onCopyTo, onDelete }: Props) {
  return (
    <div className="group relative rounded-lg border border-border bg-surface p-4 flex flex-col gap-2 hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text truncate">{skill.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onOpenInFinder(skill)}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-overlay transition-colors"
            title="Open in Finder"
          >
            <FolderOpen size={12} />
          </button>
          <button
            onClick={() => onCopyTo(skill)}
            className="p-1 rounded text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
            title="Copy to other clients"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => onDelete(skill)}
            className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete skill"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {skill.description ? (
        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      ) : (
        <p className="text-[11px] text-text-muted/40 italic">No description</p>
      )}

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
