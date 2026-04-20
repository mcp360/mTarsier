import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "../lib/utils";
import { useClientStore } from "../store/clientStore";
import { useMarketplaceInstalls } from "../hooks/useMarketplaceInstalls";
import { useMarketplace } from "../hooks/useMarketplace";
import { type McpCategory, type MarketplaceServer } from "../data/marketplace";
import { getSkillableClients } from "../store/skillStore";
import MarketplaceServerCard from "../components/marketplace/MarketplaceServerCard";
import InstallMcpDialog from "../components/marketplace/InstallMcpDialog";
import UninstallMcpDialog from "../components/marketplace/UninstallMcpDialog";
import BulkInstallDialog from "../components/marketplace/BulkInstallDialog";
import VideoModal from "../components/marketplace/VideoModal";
import RegistrySkillCard from "../components/skills/RegistrySkillCard";
import InstallSkillDialog from "../components/skills/InstallSkillDialog";
import SkillCard from "../components/skills/SkillCard";
import ViewSkillDialog from "../components/skills/ViewSkillDialog";
import CopySkillDialog from "../components/skills/CopySkillDialog";
import type { SkillSearchResult } from "../components/skills/RegistrySkillCard";
import type { InstalledSkill } from "../store/skillStore";

type MarketplaceTab = "mcp" | "skills";

function Marketplace() {
  const [tab, setTab] = useState<MarketplaceTab>("mcp");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<McpCategory | "All">("All");
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [installing, setInstalling] = useState<MarketplaceServer | null>(null);
  const [uninstalling, setUninstalling] = useState<MarketplaceServer | null>(null);
  const [watchingVideos, setWatchingVideos] = useState<MarketplaceServer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(new Set());
  const [bulkInstalling, setBulkInstalling] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const { clients, detectAll } = useClientStore();

  useEffect(() => {
    detectAll();
  }, []);
  const { servers: MARKETPLACE_SERVERS, categories: CATEGORIES } = useMarketplace();
  const installMap = useMarketplaceInstalls(clients, refreshKey);

  const FEATURED_ORDER = ["playwright", "mcp360", "excalidraw", "memory"];
  const FEATURED = FEATURED_ORDER.flatMap((id) => {
    const s = MARKETPLACE_SERVERS.find((s) => s.id === id && s.featured);
    return s ? [s] : [];
  });

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

  const handleSuccess = (clientNames: string[], mode: "install" | "remove") => {
    const name = installing?.name ?? "Server";
    setInstalling(null);
    setRefreshKey((k) => k + 1);
    const label = clientNames.length === 1 ? clientNames[0] : `${clientNames.length} clients`;
    setToast(mode === "remove" ? `${name} removed from ${label}` : `${name} installed to ${label}`);
    setTimeout(() => setToast(null), 3500);
  };

  // Only refresh + show toast — keep dialog open so user can see results
  const handleBulkSuccess = (summary: string) => {
    setRefreshKey((k) => k + 1);
    setToast(summary);
    setTimeout(() => setToast(null), 3500);
  };

  const toggleServerSelection = (id: string) => {
    setSelectedServerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedServerIds(new Set());
  };

  const handleUninstallSuccess = (clientName: string) => {
    const name = uninstalling?.name ?? "Server";
    setUninstalling(null);
    setRefreshKey((k) => k + 1);
    setToast(`${name} removed from ${clientName}`);
    setTimeout(() => setToast(null), 3500);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold">Marketplace</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Discover and install MCP servers and Skills
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["mcp", "skills"] as MarketplaceTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("text-xs px-3 py-2 border-b-2 -mb-px transition-colors capitalize",
              tab === t ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            )}>{t === "mcp" ? "MCP Servers" : "Skills"}</button>
        ))}
      </div>

      {tab === "mcp" && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-text-muted">
                Model Context Protocol integrations
              </p>
            </div>
            <button
              onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
              className={cn(
                "flex-shrink-0 text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                selectionMode
                  ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
                  : "text-text-muted border-border hover:border-border-hover hover:text-text"
              )}
            >
              {selectionMode ? "Cancel" : "Select"}
            </button>
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
                onWatchVideos={() => setWatchingVideos(server)}
                selectionMode={selectionMode}
                selected={selectedServerIds.has(server.id)}
                onToggleSelect={() => toggleServerSelection(server.id)}
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
                onWatchVideos={() => setWatchingVideos(server)}
                selectionMode={selectionMode}
                selected={selectedServerIds.has(server.id)}
                onToggleSelect={() => toggleServerSelection(server.id)}
              />
            ))}
          </div>
        )}
      </div>
        </div>
      )}

      {tab === "skills" && (
        <SkillsDiscoverSection showToast={showToast} />
      )}

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

      {/* Bulk selection action bar */}
      {selectionMode && selectedServerIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface border border-primary/30 rounded-lg px-4 py-2.5 shadow-2xl">
          <span className="text-xs text-text-muted">
            <span className="text-primary font-semibold">{selectedServerIds.size}</span> server{selectedServerIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setSelectedServerIds(new Set())}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setBulkInstalling(true)}
            className="text-xs font-medium px-3 py-1 rounded-md bg-primary text-base hover:bg-primary-dim transition-colors"
          >
            Install Selected
          </button>
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

      {/* Video modal */}
      {watchingVideos?.videos && watchingVideos.videos.length > 0 && (
        <VideoModal
          serverName={watchingVideos.name}
          videos={watchingVideos.videos}
          onClose={() => setWatchingVideos(null)}
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

      {/* Bulk install dialog */}
      {bulkInstalling && (
        <BulkInstallDialog
          servers={MARKETPLACE_SERVERS.filter((s) => selectedServerIds.has(s.id))}
          onClose={() => { setBulkInstalling(false); exitSelectionMode(); }}
          onSuccess={handleBulkSuccess}
        />
      )}
    </div>
  );
}

function SkillsDiscoverSection({ showToast }: { showToast: (msg: string) => void }) {
  const { clients: clientStates } = useClientStore();
  const detectedMetas = useMemo(
    () => clientStates.filter((cs) => cs.installed).map((cs) => cs.meta),
    [clientStates]
  );
  const clients = useMemo(() => getSkillableClients(detectedMetas), [detectedMetas]);

  const [skillsView, setSkillsView] = useState<"discover" | "installed">("discover");
  const [selectedClientId, setSelectedClientId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<SkillSearchResult | null>(null);
  const [installingSource, setInstallingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const searchCacheRef = useRef<Map<string, SkillSearchResult[]>>(new Map());
  const normalizedQuery = query.trim();
  const hasActiveQuery = normalizedQuery.length >= 2;
  const waitForNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // For installed skills
  const [allSkills, setAllSkills] = useState<Array<InstalledSkill & { clientName: string; clientId: string }>>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<InstalledSkill | null>(null);
  const [copyingSkill, setCopyingSkill] = useState<InstalledSkill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<InstalledSkill | null>(null);
  const [topPicks, setTopPicks] = useState<SkillSearchResult[]>([]);

  // Load top picks on mount
  useEffect(() => {
    invoke<SkillSearchResult[]>("get_featured_skills").then(setTopPicks).catch(() => {});
  }, []);

  // Load all skills when switching to installed view
  useEffect(() => {
    if (skillsView === "installed") {
      const loadAllSkills = async () => {
        setLoadingSkills(true);
        const skillsData: Array<InstalledSkill & { clientName: string; clientId: string }> = [];

        for (const client of clients) {
          try {
            const clientSkills = await invoke<InstalledSkill[]>("list_skills", {
              skillsPath: client.skillsPath,
            });
            skillsData.push(...clientSkills.map(skill => ({
              ...skill,
              clientName: client.name,
              clientId: client.id,
            })));
          } catch (e) {
            console.error(`Failed to load skills for ${client.name}:`, e);
          }
        }

        setAllSkills(skillsData);
        setLoadingSkills(false);
      };

      loadAllSkills();
    }
  }, [skillsView, clients]);

  // Filter skills based on selected client
  const filteredSkills = selectedClientId === "all"
    ? allSkills
    : allSkills.filter(skill => skill.clientId === selectedClientId);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      searchRequestIdRef.current += 1;
    };
  }, []);

  const runSearch = async (trimmedQuery: string, requestId: number) => {
    if (trimmedQuery.length < 2) {
      if (requestId !== searchRequestIdRef.current) return;
      setResults([]);
      setError(null);
      setSearching(false);
      return;
    }

    const cached = searchCacheRef.current.get(trimmedQuery);
    if (cached) {
      if (requestId === searchRequestIdRef.current) {
        setResults(cached);
        setError(null);
        setSearching(false);
      }
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await invoke<SkillSearchResult[]>("skills_search", { query: trimmedQuery });
      if (requestId === searchRequestIdRef.current) {
        searchCacheRef.current.set(trimmedQuery, res);
        if (searchCacheRef.current.size > 30) {
          const oldestKey = searchCacheRef.current.keys().next().value;
          if (oldestKey) {
            searchCacheRef.current.delete(oldestKey);
          }
        }
        setResults(res);
      }
    } catch (e) {
      if (requestId === searchRequestIdRef.current) {
        setError(String(e));
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearching(false);
      }
    }
  };

  const renderedResultCards = useMemo(
    () =>
      results.map((s) => (
        <RegistrySkillCard
          key={s.id}
          skill={s}
          installing={installingSource === s.id}
          onInstall={setPendingInstall}
        />
      )),
    [results, installingSource]
  );

  const activeInstallingSkillName = useMemo(() => {
    if (!installingSource) return null;
    const fromResults = results.find((s) => s.id === installingSource)?.name;
    if (fromResults) return fromResults;
    if (pendingInstall?.id === installingSource) return pendingInstall.name;
    return "skill";
  }, [installingSource, results, pendingInstall]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const requestId = ++searchRequestIdRef.current;

    if (!hasActiveQuery) {
      setResults([]);
      setError(null);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(normalizedQuery, requestId);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [normalizedQuery, hasActiveQuery]);

  const handleInstallConfirm = async (clientIds: string[]) => {
    if (!pendingInstall) return;
    const installSource = pendingInstall.id?.trim() || pendingInstall.source?.trim();
    if (!installSource) {
      throw new Error("Invalid skill source");
    }

    if (clientIds.length === 0) {
      throw new Error("Please select at least one client");
    }

    // Split selected clients: npx-capable vs file-copy
    const selectedClients = clientIds.map((id) => clients.find((c) => c.id === id)).filter(Boolean);
    const npxAgentIds = selectedClients.filter((c) => c!.npxAgentId).map((c) => c!.npxAgentId!);
    const npxFallbackPaths = selectedClients
      .filter((c) => c!.npxAgentId && c!.skillsPath)
      .map((c) => c!.skillsPath!);
    const targetPaths = selectedClients
      .filter((c) => !c!.npxAgentId && c!.skillsPath)
      .map((c) => c!.skillsPath!);

    if (npxAgentIds.length === 0 && targetPaths.length === 0) {
      throw new Error("No valid client paths selected for installation");
    }

    setInstallingSource(pendingInstall.id);
    try {
      await waitForNextFrame();
      const installedName = await invoke<string>("skills_install", {
        source: installSource,
        targetPaths,
        npxAgentIds,
        npxFallbackPaths,
        requestedName: pendingInstall.name,
      });
      showToast(`"${installedName || pendingInstall.name}" installed for ${clientIds.length} client${clientIds.length > 1 ? "s" : ""}`);
    } catch (e) {
      throw new Error(String(e));
    } finally {
      setInstallingSource(null);
    }
  };

  return (
    <div className="mb-10">
      {/* View toggle: Discover / Installed */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setSkillsView("discover")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md border transition-colors",
            skillsView === "discover"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-text-muted border-border hover:border-border-hover hover:text-text"
          )}
        >
          Discover
        </button>
        <button
          onClick={() => setSkillsView("installed")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md border transition-colors",
            skillsView === "installed"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-text-muted border-border hover:border-border-hover hover:text-text"
          )}
        >
          Installed
        </button>
      </div>

      {/* Client filters for Installed view */}
      {skillsView === "installed" && clients.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedClientId("all")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              selectedClientId === "all"
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            All
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedClientId === c.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-text-muted border-border hover:border-border-hover hover:text-text"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {skillsView === "discover" && (
        <>
          <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        {query && (
          <>
            {searching ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
            ) : (
              <button
                onClick={() => {
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                    debounceRef.current = null;
                  }
                  searchRequestIdRef.current += 1;
                  setQuery("");
                  setResults([]);
                  setError(null);
                  setSearching(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors"
                title="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        )}
        <input
          type="text"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(e) => {
            const nextValue = e.target.value;
            const nextTrimmed = nextValue.trim();
            setQuery(nextValue);

            if (nextTrimmed.length < 2) {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
              }
              searchRequestIdRef.current += 1;
              setResults([]);
              setError(null);
              setSearching(false);
              return;
            }

            setError(null);
            setSearching(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              const requestId = ++searchRequestIdRef.current;
              setSearching(true);
              runSearch(normalizedQuery, requestId);
            }
          }}
          placeholder="Search skills (e.g. react, git, typescript)..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/40"
        />
      </div>

      {error && <p className="text-[11px] text-red-400 mb-4">{error}</p>}
      {installingSource && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="w-3.5 h-3.5 border border-primary/40 border-t-primary rounded-full animate-spin" />
          <p className="text-[11px] text-primary">
            Installing <span className="font-medium">{activeInstallingSkillName}</span>...
          </p>
        </div>
      )}

      {searching && hasActiveQuery ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                <div className="h-3 w-24 rounded bg-surface-overlay" />
              </div>
              <div className="h-2 w-full rounded bg-surface-overlay" />
              <div className="h-8 rounded-md bg-surface-overlay" />
            </div>
          ))}
        </div>
      ) : !hasActiveQuery ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Top Picks</p>
            <div className="flex flex-wrap gap-1.5">
              {["react", "typescript", "python", "git"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border text-text-muted hover:border-primary/30 hover:text-primary transition-colors capitalize"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {topPicks.map((skill) => (
              <RegistrySkillCard
                key={skill.id}
                skill={skill}
                installing={installingSource === skill.id}
                onInstall={setPendingInstall}
              />
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <svg className="w-10 h-10 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 12.828a4 4 0 015.656 0M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-sm text-text-muted">No results for "{query}"</p>
          <p className="text-[11px] text-text-muted/50">Try a different search term</p>
        </div>
      ) : (
        <div key={normalizedQuery} className="grid grid-cols-3 gap-3">
          {renderedResultCards}
        </div>
      )}
        </>
      )}

      {skillsView === "installed" && (
        <>
          {loadingSkills ? (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                    <div className="h-3 w-24 rounded bg-surface-overlay" />
                  </div>
                  <div className="h-2 w-full rounded bg-surface-overlay" />
                </div>
              ))}
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm text-text-muted">No skills installed</p>
              <p className="text-[11px] text-text-muted/50">
                {selectedClientId === "all"
                  ? "Switch to Discover tab to install skills"
                  : `No skills installed for ${clients.find(c => c.id === selectedClientId)?.name}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredSkills.map((skill) => (
                <div key={`${skill.clientId}-${skill.path}`} className="relative">
                  <SkillCard
                    skill={skill}
                    onOpenInFinder={async () => {
                      try {
                        await invoke("reveal_in_finder", { path: skill.path });
                      } catch (e) {
                        showToast(String(e));
                      }
                    }}
                    onView={() => setViewingSkill(skill)}
                    onCopyTo={() => setCopyingSkill(skill)}
                    onDelete={() => setDeletingSkill(skill)}
                  />
                  {selectedClientId === "all" && (
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                        {skill.clientName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {pendingInstall && (
        <InstallSkillDialog
          skill={pendingInstall}
          onClose={() => setPendingInstall(null)}
          onInstall={handleInstallConfirm}
        />
      )}

      {viewingSkill && (
        <ViewSkillDialog skill={viewingSkill} onClose={() => setViewingSkill(null)} />
      )}

      {copyingSkill && (
        <CopySkillDialog
          skill={copyingSkill}
          sourceClientId={((copyingSkill as InstalledSkill & { clientId?: string }).clientId) ?? ""}
          onClose={() => setCopyingSkill(null)}
          onCopy={async (targetClientIds, _skill) => {
            for (const id of targetClientIds) {
              const target = clients.find((c) => c.id === id);
              if (target?.skillsPath) {
                await invoke("write_skill", { skillsPath: target.skillsPath, skillName: copyingSkill.name, content: copyingSkill.raw_content });
              }
            }
            setCopyingSkill(null);
            showToast(`"${copyingSkill.name}" copied to ${targetClientIds.length} client${targetClientIds.length > 1 ? "s" : ""}`);
          }}
        />
      )}

      {deletingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <p className="text-sm font-semibold text-text">Delete skill?</p>
            <p className="text-xs text-text-muted">This will permanently delete <span className="text-text font-medium">"{deletingSkill.name}"</span>.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingSkill(null)} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors">Cancel</button>
              <button
                onClick={async () => {
                  await invoke("delete_skill", { skillPath: deletingSkill.path });
                  setDeletingSkill(null);
                  setAllSkills((prev) => prev.filter((sk) => sk.path !== deletingSkill.path));
                  showToast(`Deleted "${deletingSkill.name}"`);
                }}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
