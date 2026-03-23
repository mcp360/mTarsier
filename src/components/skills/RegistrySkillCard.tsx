interface SkillSearchResult {
  source: string;
  name: string;
  installs: number;
  url: string;
}

interface Props {
  skill: SkillSearchResult;
  installing: boolean;
  onInstall: (source: string) => void;
}

export default function RegistrySkillCard({ skill, installing, onInstall }: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-2.5 hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-md bg-surface-overlay border border-border flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text truncate">{skill.name}</p>
            <p className="text-[10px] text-text-muted/60 truncate font-mono">{skill.source.split("@")[0]}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-[10px] text-text-muted/50 whitespace-nowrap">
          {skill.installs.toLocaleString()} installs
        </span>
      </div>

      <p className="text-[10px] font-mono text-text-muted/50 truncate">{skill.source}</p>

      <button
        onClick={() => onInstall(skill.source)}
        disabled={installing}
        className="mt-auto text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50 disabled:opacity-50 transition-colors"
      >
        {installing ? "Installing…" : "Install globally"}
      </button>
    </div>
  );
}

export type { SkillSearchResult };
