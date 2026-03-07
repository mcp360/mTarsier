import { useState, useEffect } from "react";
import { useClientStore } from "../store/clientStore";
import { useConfigStore } from "../store/configStore";

function SystemStatus() {
  const [time, setTime] = useState(() => formatTime());
  const clients = useClientStore((s) => s.clients);
  const servers = useConfigStore((s) => s.servers);

  const clientCount = clients.filter((c) => c.installed).length;
  const serverCount = Object.keys(servers).length;

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
            {serverCount} servers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
            {clientCount} clients
          </span>
        </div>
        <span className="font-mono">{time}</span>
      </div>
    </div>
  );
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default SystemStatus;
