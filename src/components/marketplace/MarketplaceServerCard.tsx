import { cn } from "../../lib/utils";
import type { MarketplaceServer, McpCategory } from "../../data/marketplace";

const CATEGORY_STYLES: Record<McpCategory, { icon: string; pill: string }> = {
  Developer: {
    icon: "bg-cyan/15 text-cyan",
    pill: "bg-cyan/10 text-cyan border-cyan/20",
  },
  Web: {
    icon: "bg-purple/15 text-purple",
    pill: "bg-purple/10 text-purple border-purple/20",
  },
  Data: {
    icon: "bg-amber/15 text-amber",
    pill: "bg-amber/10 text-amber border-amber/20",
  },
  Productivity: {
    icon: "bg-primary/15 text-primary",
    pill: "bg-primary/10 text-primary border-primary/20",
  },
  AI: {
    icon: "bg-emerald-400/15 text-emerald-400",
    pill: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
  Search: {
    icon: "bg-rose-400/15 text-rose-400",
    pill: "bg-rose-400/10 text-rose-400 border-rose-400/20",
  },
  Automation: {
    icon: "bg-orange-400/15 text-orange-400",
    pill: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  },
};

/** Build a readable command preview, stripping flags and placeholders. */
function commandPreview(server: MarketplaceServer): string {
  const parts = server.args.filter(
    (a) => !a.startsWith("-") && !a.startsWith("{") && !a.startsWith("http")
  );
  const line = [server.command, ...parts].join(" ");
  return line.length > 46 ? line.slice(0, 44) + "…" : line;
}

/** Detect whether the server runs locally (stdio) or via remote proxy. */
function transportLabel(server: MarketplaceServer): string {
  const usesRemote = server.args.some(
    (a) => a.includes("mcp-remote") || a.startsWith("http")
  );
  return usesRemote ? "remote" : "stdio";
}

/** Compact label for the installed badge. */
function installedBadgeLabel(installedIn: string[]): string {
  if (installedIn.length === 1) return `✓ ${installedIn[0]}`;
  return `✓ ${installedIn.length} clients`;
}

interface Props {
  server: MarketplaceServer;
  featured?: boolean;
  /** Names of clients that already have this server installed. */
  installedIn: string[];
  onInstall: () => void;
  onUninstall: () => void;
}

function MarketplaceServerCard({ server, featured, installedIn, onInstall, onUninstall }: Props) {
  const styles = CATEGORY_STYLES[server.category];
  const isInstalled = installedIn.length > 0;
  const transport = transportLabel(server);
  const preview = commandPreview(server);
  const envKeys = server.apiKeys?.map((k) => k.key) ?? [];

  return (
    <div
      className={cn(
        "relative flex flex-col bg-surface border border-border rounded-lg hover:border-border-hover transition-colors",
        featured ? "p-5" : "p-4"
      )}
    >
      {isInstalled && (
        <button
          onClick={onUninstall}
          title={`Installed in: ${installedIn.join(", ")} — click to manage`}
          className="absolute top-2.5 right-2.5 text-[10px] font-medium text-primary/70 hover:text-primary underline underline-offset-2 decoration-transparent hover:decoration-primary/60 transition-colors cursor-pointer focus:outline-none"
        >
          {installedBadgeLabel(installedIn)}
        </button>
      )}
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "flex-shrink-0 flex items-center justify-center rounded-lg font-bold",
            styles.icon,
            featured ? "w-10 h-10 text-base" : "w-8 h-8 text-xs"
          )}
        >
          {server.name[0]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "font-semibold text-text",
                featured ? "text-sm" : "text-xs"
              )}
            >
              {server.name}
            </span>
            {server.official && (
              <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium leading-none">
                Official
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-muted">{server.publisher}</span>
        </div>
      </div>

      {/* Description */}
      <p
        className={cn(
          "text-text-muted mb-3 line-clamp-2 leading-snug",
          featured ? "text-xs" : "text-[11px]"
        )}
      >
        {server.description}
      </p>

      {/* Command + env details */}
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center gap-1.5 bg-base rounded px-2 py-1.5 min-w-0">
          <span className="text-text-muted/50 text-[10px] font-mono flex-shrink-0">$</span>
          <span className="text-[10px] font-mono text-text-muted truncate" title={[server.command, ...server.args].join(" ")}>
            {preview}
          </span>
        </div>

        {envKeys.length > 0 && (
          <div className="flex items-center gap-1.5 px-2">
            <svg
              className="w-2.5 h-2.5 text-text-muted/60 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[10px] text-text-muted/70 font-mono truncate">
              {envKeys.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Footer — single row */}
      <div className="flex items-center gap-1.5 mt-auto">
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0",
            styles.pill
          )}
        >
          {server.category}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 text-text-muted border-border">
          {transport}
        </span>

        <button
          onClick={onInstall}
          title="Install to a client"
          className="text-[10px] font-medium px-2 py-0.5 rounded border transition-colors border-primary/30 text-primary/80 hover:border-primary hover:text-primary focus:outline-none cursor-pointer ml-auto flex-shrink-0"
        >
          Install
        </button>
      </div>
    </div>
  );
}

export default MarketplaceServerCard;
