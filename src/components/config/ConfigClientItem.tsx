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
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors overflow-hidden ${
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-surface-hover border border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{client.name}</span>
          {configExists && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
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
