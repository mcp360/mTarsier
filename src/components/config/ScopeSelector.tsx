import { useConfigStore } from "../../store/configStore";

function ScopeSelector() {
  const { activeScope, projectScopes, setScope } = useConfigStore();

  return (
    <div className="relative min-w-0">
      <select
        value={activeScope}
        onChange={(e) => setScope(e.target.value)}
        className="appearance-none rounded-md border border-border bg-surface pl-2.5 pr-7 py-1 text-[11px] text-text focus:border-primary/60 focus:outline-none cursor-pointer hover:border-primary/40 transition-colors max-w-[200px]"
      >
        <optgroup label="~/.claude.json">
          <option value="user">Global (--scope user)</option>
          <option value="local">Local / home dir</option>
        </optgroup>
        {projectScopes.length > 0 && (
          <optgroup label="Per-project">
            {projectScopes.map((p) => {
              const label = p.path.replace(/^\/Users\/[^/]+\//, "~/");
              return (
                <option key={p.path} value={p.path}>
                  {label} ({p.server_count})
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default ScopeSelector;
