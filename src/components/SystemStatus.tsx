import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useClientStore } from "../store/clientStore";

function SystemStatus() {
  const [version, setVersion] = useState("");
  const clients = useClientStore((s) => s.clients);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  useEffect(() => { getVersion().then(setVersion); }, []);

  const installedClients = clients.filter((c) => c.installed);
  const clientCount = installedClients.length;
  const serverCount = installedClients.reduce((sum, c) => sum + (c.serverCount ?? 0), 0);

  const serverLines = [
    `${serverCount} installed servers`,
    ...installedClients
      .filter((c) => (c.serverCount ?? 0) > 0)
      .map((c) => `· ${c.meta.name}: ${c.serverCount}`),
  ];

  const clientLines = [
    `${clientCount} configured clients`,
    ...installedClients.map((c) => `· ${c.meta.name}`),
  ];

  const showTooltip = (e: React.MouseEvent, lines: string[]) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, lines });
  };

  const dot = <span className="h-1.5 w-1.5 rounded-full bg-primary/40 flex-shrink-0" />;

  return (
    <>
      <div className="border-t border-border px-4 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-text-muted/60">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 cursor-default"
              onMouseEnter={(e) => showTooltip(e, serverLines)}
              onMouseLeave={() => setTooltip(null)}
            >
              {dot}{serverCount} servers
            </span>
            <span
              className="flex items-center gap-1.5 cursor-default"
              onMouseEnter={(e) => showTooltip(e, clientLines)}
              onMouseLeave={() => setTooltip(null)}
            >
              {dot}{clientCount} clients
            </span>
          </div>
          {version && <span className="font-mono text-[10px]">v{version}</span>}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-surface border border-border rounded-md px-2.5 py-2 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.lines.map((line, i) => (
            <div
              key={i}
              className={i === 0 ? "text-[11px] text-text font-medium" : "text-[10px] text-text-muted mt-0.5"}
            >
              {line}
            </div>
          ))}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </div>
      )}
    </>
  );
}

export default SystemStatus;
