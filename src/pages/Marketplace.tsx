import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "../lib/utils";
import { useClientStore } from "../store/clientStore";
import { useMarketplaceInstalls } from "../hooks/useMarketplaceInstalls";
import {
  MARKETPLACE_SERVERS,
  CATEGORIES,
  type McpCategory,
  type MarketplaceServer,
} from "../data/marketplace";
import MarketplaceServerCard from "../components/marketplace/MarketplaceServerCard";
import InstallMcpDialog from "../components/marketplace/InstallMcpDialog";
import UninstallMcpDialog from "../components/marketplace/UninstallMcpDialog";

const FEATURED = MARKETPLACE_SERVERS.filter((s) => s.featured);

function Marketplace() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<McpCategory | "All">("All");
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [installing, setInstalling] = useState<MarketplaceServer | null>(null);
  const [uninstalling, setUninstalling] = useState<MarketplaceServer | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const { clients } = useClientStore();
  const installMap = useMarketplaceInstalls(clients, refreshKey);

  const isFiltering = search.trim() !== "" || activeCategory !== "All";

  const filteredServers = MARKETPLACE_SERVERS.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.publisher.toLowerCase().includes(q);
    const matchesCategory =
      activeCategory === "All" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // When filtering: show all matches in grid. When not: exclude featured from grid.
  const gridServers = isFiltering
    ? filteredServers
    : filteredServers.filter((s) => !s.featured);

  const handleSuccess = (clientName: string) => {
    const name = installing?.name ?? "Server";
    setInstalling(null);
    setRefreshKey((k) => k + 1);
    setToast(`${name} installed to ${clientName}`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleUninstallSuccess = (clientName: string) => {
    const name = uninstalling?.name ?? "Server";
    setUninstalling(null);
    setRefreshKey((k) => k + 1);
    setToast(`${name} removed from ${clientName}`);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold">Marketplace</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Discover and install MCP servers
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search servers..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/40"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {(["All", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as McpCategory | "All")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              activeCategory === cat
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured row — hidden when actively filtering */}
      {!isFiltering && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-xs">✦</span>
            <h2 className="text-xs font-semibold text-text">Featured</h2>
            {FEATURED.length > 3 && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setFeaturedOffset((o) => Math.max(0, o - 1))}
                  disabled={featuredOffset === 0}
                  className="flex items-center justify-center w-5 h-5 rounded border border-border text-text-muted hover:border-border-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setFeaturedOffset((o) => Math.min(FEATURED.length - 3, o + 1))}
                  disabled={featuredOffset >= FEATURED.length - 3}
                  className="flex items-center justify-center w-5 h-5 rounded border border-border text-text-muted hover:border-border-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FEATURED.slice(featuredOffset, featuredOffset + 3).map((server) => (
              <MarketplaceServerCard
                key={server.id}
                server={server}
                featured
                installedIn={installMap.get(server.id) ?? []}
                onInstall={() => setInstalling(server)}
                onUninstall={() => setUninstalling(server)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Server grid */}
      <div>
        <h2 className="text-xs font-semibold text-text mb-3">
          {isFiltering
            ? `Results (${gridServers.length})`
            : `All Servers (${MARKETPLACE_SERVERS.length - FEATURED.length})`}
        </h2>

        {gridServers.length === 0 ? (
          <div>
            {/* Skeleton ghost cards */}
            <div className="grid grid-cols-3 gap-3 mb-6 opacity-30 pointer-events-none select-none">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                    <div className="h-3 w-24 rounded bg-surface-overlay" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-surface-overlay" />
                    <div className="h-2 w-3/4 rounded bg-surface-overlay" />
                  </div>
                  <div className="h-6 w-16 rounded bg-surface-overlay" />
                </div>
              ))}
            </div>
            {/* Request CTA */}
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-xs text-text-muted">
                No results for <span className="text-text font-medium">"{search}"</span>
                {activeCategory !== "All" && <> in <span className="text-text font-medium">{activeCategory}</span></>}
              </p>
              <p className="text-[11px] text-text-muted/60">Don't see what you're looking for?</p>
              <button
                onClick={() => open("https://mcp360.ai/mtarsier/github/request-server")}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Request this server on GitHub
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {gridServers.map((server) => (
              <MarketplaceServerCard
                key={server.id}
                server={server}
                installedIn={installMap.get(server.id) ?? []}
                onInstall={() => setInstalling(server)}
                onUninstall={() => setUninstalling(server)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-surface border border-primary/30 text-xs text-primary px-4 py-2.5 rounded-lg shadow-xl">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {toast}
        </div>
      )}

      {/* Install dialog */}
      {installing && (
        <InstallMcpDialog
          server={installing}
          installedIn={installMap.get(installing.id) ?? []}
          onClose={() => setInstalling(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Uninstall dialog */}
      {uninstalling && (
        <UninstallMcpDialog
          server={uninstalling}
          installedIn={installMap.get(uninstalling.id) ?? []}
          onClose={() => setUninstalling(null)}
          onSuccess={handleUninstallSuccess}
        />
      )}
    </div>
  );
}

export default Marketplace;
