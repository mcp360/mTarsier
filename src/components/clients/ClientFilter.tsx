import { useClientStore } from "../../store/clientStore";
import type { ClientType } from "../../types/client";

const TYPE_ORDER: ClientType[] = ["Desktop", "IDE", "CLI", "Web", "Framework"];

const accentMap: Record<string, string> = {
  All: "bg-primary/15 text-primary border-primary/30",
  Desktop: "bg-primary/15 text-primary border-primary/30",
  IDE: "bg-primary/15 text-primary border-primary/30",
  CLI: "bg-primary/15 text-primary border-primary/30",
  Web: "bg-primary/15 text-primary border-primary/30",
  Framework: "bg-primary/15 text-primary border-primary/30",
};

function ClientFilter() {
  const { clients, filter, setFilter } = useClientStore();

  const counts: Record<string, number> = { All: clients.length };
  for (const c of clients) {
    counts[c.meta.type] = (counts[c.meta.type] || 0) + 1;
  }

  // Only show type tabs that actually have clients, in a fixed order
  const activeTypes = TYPE_ORDER.filter((t) => (counts[t] ?? 0) > 0);
  const filters: (ClientType | "All")[] = ["All", ...activeTypes];

  const installedCount = clients.filter((c) => c.installed).length;
  const total = clients.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {filters.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? accentMap[f]
                  : "border-border bg-surface text-text-muted hover:border-border hover:bg-surface-hover"
              }`}
            >
              {f}
              <span className="ml-1.5 rounded bg-white/5 px-1 py-0.5 text-[10px]">{counts[f] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-text-muted">
        {installedCount} of {total} clients installed
      </p>
    </div>
  );
}

export default ClientFilter;
