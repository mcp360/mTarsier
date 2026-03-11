import { useState } from "react";
import type { ClientMeta } from "../../types/client";

interface Props {
  client: ClientMeta;
  isSelected: boolean;
  configExists: boolean;
  onSelect: () => void;
}

const typeBadgeColors: Record<string, string> = {
  Desktop: "bg-surface-overlay text-text-muted",
  IDE: "bg-surface-overlay text-text-muted",
  CLI: "bg-surface-overlay text-text-muted",
};

function ConfigClientItem({ client, isSelected, configExists, onSelect }: Props) {
  const [dotHovered, setDotHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-surface-hover border border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{client.name}</span>
          {configExists && (
            <span
              className="relative flex-shrink-0 p-1 -m-1"
              onMouseEnter={() => setDotHovered(true)}
              onMouseLeave={() => setDotHovered(false)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
              {dotHovered && (
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+2px)] px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-overlay text-primary whitespace-nowrap z-50">
                  Installed
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <span
        className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
          typeBadgeColors[client.type] ?? "bg-surface text-text-muted"
        }`}
      >
        {client.type}
      </span>
    </button>
  );
}

export default ConfigClientItem;
