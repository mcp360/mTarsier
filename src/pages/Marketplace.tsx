import { useState } from "react";
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
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <svg
              className="w-8 h-8 mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <p className="text-xs">No servers found for "{search}"</p>
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
