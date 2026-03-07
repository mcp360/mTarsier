import { useThemeStore } from "../store/themeStore";
import { themes, type ThemeId } from "../lib/themes";

const themeList = Object.values(themes);

function ThemePreview({ id, active }: { id: ThemeId; active: boolean }) {
  const t = themes[id];
  const c = t.colors;
  return (
    <div
      className="w-full h-20 rounded-lg border overflow-hidden"
      style={{
        backgroundColor: c.base,
        borderColor: active ? c.primary : c.border,
      }}
    >
      {/* Mini sidebar + content preview */}
      <div className="flex h-full">
        <div
          className="w-10 h-full flex flex-col items-center gap-1.5 pt-2"
          style={{ backgroundColor: c.surface, borderRight: `1px solid ${c.border}` }}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.primary, opacity: 0.8 }} />
          <div className="w-4 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
          <div className="w-4 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: c.text }} />
          <div className="w-20 h-1 rounded-full" style={{ backgroundColor: c["text-muted"] }} />
          <div className="flex gap-1 mt-1">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.primary, opacity: 0.2 }} />
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.cyan, opacity: 0.2 }} />
            <div className="w-6 h-3 rounded" style={{ backgroundColor: c.amber, opacity: 0.2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const { themeId, setTheme } = useThemeStore();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-text-muted">Application settings and preferences.</p>
      </div>

      <div className="flex-1 space-y-8 px-6 pb-6">

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          Theme
        </h2>
        <div className="grid grid-cols-3 gap-4 max-w-2xl">
          {themeList.map((t) => {
            const isActive = themeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-text-muted/30 bg-surface"
                }`}
              >
                <ThemePreview id={t.id} active={isActive} />
                <div className="mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          General
        </h2>
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium">Auto-detect clients on launch</p>
              <p className="text-xs text-text-muted mt-0.5">Scan for installed MCP clients when the app starts</p>
            </div>
            <span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] text-text-muted">Coming soon</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium">Backup frequency</p>
              <p className="text-xs text-text-muted mt-0.5">Automatically back up configs at a set interval</p>
            </div>
            <span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] text-text-muted">Coming soon</span>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

export default Settings;
