import type { TransportType } from "../../types/config";

interface Props {
  value: TransportType;
  onChange: (t: TransportType) => void;
  supportedTransports: TransportType[];
}

const badgeStyles: Record<TransportType, string> = {
  stdio: "border-primary/30 bg-primary/10 text-primary",
  sse: "border-primary/30 bg-primary/10 text-primary",
  "streamable-http": "border-primary/30 bg-primary/10 text-primary",
  "remote-mcp": "border-primary/30 bg-primary/10 text-primary",
};

const labels: Record<TransportType, string> = {
  stdio: "stdio",
  sse: "sse",
  "streamable-http": "streamable-http",
  "remote-mcp": "remote (mcp-remote)",
};

function TransportSelector({ value, onChange, supportedTransports }: Props) {
  const transports = supportedTransports.length > 0
    ? supportedTransports
    : (["stdio", "sse", "streamable-http"] as TransportType[]);

  return (
    <div className="flex flex-wrap gap-2">
      {transports.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            value === t
              ? badgeStyles[t]
              : "border-border text-text-muted hover:text-text hover:border-border"
          }`}
        >
          {labels[t]}
        </button>
      ))}
    </div>
  );
}

export default TransportSelector;
