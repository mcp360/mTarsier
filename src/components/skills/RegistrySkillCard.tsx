import { Download } from "lucide-react";

export interface SkillSearchResult {
  id: string;
  name: string;
  installs?: number;
  source?: string;
  description?: string;
}

interface Props {
  skill: SkillSearchResult;
  installing: boolean;
  onInstall: (skill: SkillSearchResult) => void;
}

function shortSource(source?: string): string | null {
  if (!source) return null;
  const clean = source
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^https?:\/\/raw\.githubusercontent\.com\//, "")
    .replace(/\.git$/, "");
  const parts = clean.split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0] ?? null;
}

function formatInstalls(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
}

export function RegistrySkillListRow({ skill, installing, onInstall }: Props) {
  const repo = shortSource(skill.source);
  return (
    <div className="group flex items-center gap-3 border-b border-border/50 bg-surface px-4 py-3 last:border-0 hover:bg-surface-overlay transition-colors">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-text truncate">{skill.name}</p>
          {repo && <span className="flex-shrink-0 text-[10px] text-text-muted/50 truncate">{repo}</span>}
        </div>
        {skill.description && (
          <p className="text-[11px] text-text-muted truncate mt-0.5">{skill.description}</p>
        )}
      </div>
      {skill.installs != null && skill.installs > 0 && (
        <span className="flex-shrink-0 text-[10px] text-text-muted/50 tabular-nums">{formatInstalls(skill.installs)}</span>
      )}
      <button
        onClick={() => onInstall(skill)}
        disabled={installing}
        className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {installing ? "Installing…" : "Install"}
      </button>
    </div>
  );
}

export default function RegistrySkillCard({ skill, installing, onInstall }: Props) {
  const repo = shortSource(skill.source);

  return (
    <div className="group rounded-xl border border-border bg-surface flex flex-col overflow-hidden hover:border-border-hover hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text truncate leading-snug">{skill.name}</p>
          {repo && <p className="text-[10px] text-text-muted/60 truncate mt-0.5">{repo}</p>}
        </div>
        {skill.installs != null && skill.installs > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 text-[10px] text-text-muted/50 tabular-nums mt-0.5">
            <Download size={9} />
            {formatInstalls(skill.installs)}
          </div>
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

      {/* Footer */}
      <div className="border-t border-border/60 px-4 py-2.5">
        <button
          onClick={() => onInstall(skill)}
          disabled={installing}
          className="w-full text-[11px] font-medium py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {installing ? "Installing…" : "Install"}
        </button>
      </div>
    </div>
  );
}
