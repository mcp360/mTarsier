import { useConfigStore } from "../../store/configStore";

function ScopeSelector() {
  const { activeScope, projectScopes, setScope } = useConfigStore();

  return (
    <select
      value={activeScope}
      onChange={(e) => setScope(e.target.value)}
      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted focus:border-primary focus:outline-none"
    >
      <optgroup label="~/.claude.json">
        <option value="user">Global — all projects (--scope user)</option>
        <option value="local">Local — home dir (--scope local)</option>
      </optgroup>
      {projectScopes.length > 0 && (
        <optgroup label="Per-project local">
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
  );
}

export default ScopeSelector;
