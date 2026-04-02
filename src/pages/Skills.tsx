import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../lib/utils";
import { useSkillStore, getSkillableClients } from "../store/skillStore";
import { useClientStore } from "../store/clientStore";
import type { InstalledSkill } from "../store/skillStore";
import SkillCard from "../components/skills/SkillCard";
import CopySkillDialog from "../components/skills/CopySkillDialog";
import InstallSkillDialog from "../components/skills/InstallSkillDialog";
import AddSkillDialog from "../components/skills/AddSkillDialog";
import ViewSkillDialog from "../components/skills/ViewSkillDialog";
import RegistrySkillCard from "../components/skills/RegistrySkillCard";
import type { SkillSearchResult } from "../components/skills/RegistrySkillCard";

type Tab = "installed" | "discover";

function Skills() {
  const [tab, setTab] = useState<Tab>("installed");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<InstalledSkill | null>(null);
  const [copying, setCopying] = useState<InstalledSkill | null>(null);
  const [deleting, setDeleting] = useState<InstalledSkill | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { clients: clientStates } = useClientStore();
  // Filter out false positives: clients marked as installed but whose binary doesn't actually exist
  // This happens when only config files exist (e.g. ~/.gemini/ or ~/.config/opencode/)
  const detectedMetas = clientStates
    .filter((cs) => {
      // Only show as installed if:
      // 1. detection says installed AND
      // 2. either has servers configured OR is not a CLI tool with just empty config
      const hasServers = (cs.serverCount ?? 0) > 0;
      const isCliWithOnlyConfig = cs.meta.detection.kind === "cli_binary" && cs.configExists && !hasServers;

      return cs.installed && !isCliWithOnlyConfig;
    })
    .map((cs) => cs.meta);
  const clients = getSkillableClients(detectedMetas);
  const { selectedClientId, skills, isLoading, setSelectedClient, loadSkills, writeSkill, deleteSkill, deleteSkills } = useSkillStore();
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClient("all");
    }
  }, [clients.length]);

  useEffect(() => {
    if (selectedClientId && selectedClientId !== "all" && selectedClient) {
      loadSkills(selectedClient.skillsPath);
    }
  }, [selectedClientId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenInFinder = async (skill: InstalledSkill) => {
    try { await invoke("reveal_in_finder", { path: skill.path }); }
    catch (e) { showToast(String(e)); }
  };

  const handleCopySkill = async (targetClientIds: string[], skill: InstalledSkill) => {
    for (const id of targetClientIds) {
      const targetClient = clients.find((c) => c.id === id);
      if (targetClient?.skillsPath) {
        await writeSkill(targetClient.skillsPath, skill.name, skill.raw_content);
      }
    }
    showToast(`"${skill.name}" copied to ${targetClientIds.length} client${targetClientIds.length > 1 ? "s" : ""}`);
  };

  const handleDelete = async () => {
    if (!deleting || !selectedClientId || !selectedClient) return;
    await deleteSkill(deleting.path, selectedClient.skillsPath);
    setDeleting(null);
    showToast(`Deleted "${deleting.name}"`);
  };

  const handleAddSkill = async (skillName: string, content: string) => {
    if (!selectedClientId || !selectedClient?.skillsPath) throw new Error("Select a client first");
    if (skills.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) {
      throw new Error("A skill with this name already exists for the selected client");
    }
    await writeSkill(selectedClient.skillsPath, skillName, content);
    showToast(`"${skillName}" added to ${selectedClient?.name ?? "selected client"}`);
  };

  const handleInstalled = (name: string, clientIds: string[]) => {
    if (clientIds.length > 0) {
      const firstClient = clients.find((c) => c.id === clientIds[0]);
      setSelectedClient(clientIds[0]);
      if (firstClient?.skillsPath) {
        loadSkills(firstClient.skillsPath);
      }
      showToast(`"${name}" installed for ${clientIds.length} client${clientIds.length > 1 ? "s" : ""}`);
      return;
    }
    showToast(`"${name}" installed globally`);
    if (selectedClientId && selectedClient?.skillsPath) {
      loadSkills(selectedClient.skillsPath);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Skills</h1>
        <p className="text-xs text-text-muted mt-0.5">Manage AI agent skills across clients</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border">
        {(["installed", "discover"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("text-xs px-3 py-2 border-b-2 -mb-px transition-colors capitalize",
              tab === t ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            )}>{t}</button>
        ))}
      </div>

      {tab === "installed" && (
        <InstalledTab
          clients={clients} selectedClientId={selectedClientId}
          skills={skills} isLoading={isLoading}
          onSelectClient={setSelectedClient}
          onAdd={() => setAdding(true)}
          canAdd={Boolean(selectedClientId)}
          onOpenInFinder={handleOpenInFinder}
          onView={setViewing}
          onCopyTo={setCopying} onDelete={setDeleting}
          deleteSkills={deleteSkills}
          showToast={showToast}
        />
      )}
      {tab === "discover" && (
        <DiscoverTab
          clients={clients}
          onInstalled={handleInstalled}
        />
      )}

      {adding && selectedClient && (
        <AddSkillDialog
          clientName={selectedClient.name}
          onClose={() => setAdding(false)}
          onCreate={handleAddSkill}
        />
      )}
      {viewing && (
        <ViewSkillDialog
          skill={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {copying && selectedClientId && (
        <CopySkillDialog skill={copying} sourceClientId={selectedClientId}
          onClose={() => setCopying(null)} onCopy={handleCopySkill} />
      )}
      {deleting && (
        <DeleteConfirmDialog skill={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-surface border border-primary/30 text-xs text-primary px-4 py-2.5 rounded-lg shadow-xl">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}

function InstalledTab({ clients, selectedClientId, skills, isLoading, onSelectClient, onAdd, canAdd, onOpenInFinder, onView, onCopyTo, onDelete, deleteSkills, showToast }: {
  clients: ReturnType<typeof getSkillableClients>;
  selectedClientId: string | null;
  skills: InstalledSkill[];
  isLoading: boolean;
  onSelectClient: (id: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  onOpenInFinder: (s: InstalledSkill) => void;
  onView: (s: InstalledSkill) => void;
  onCopyTo: (s: InstalledSkill) => void;
  onDelete: (s: InstalledSkill) => void;
  deleteSkills: (paths: string[], skillsPath: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // For "All" view - load skills from all clients
  const [allSkills, setAllSkills] = useState<Array<InstalledSkill & { clientName: string; clientId: string }>>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (selectedClientId === "all") {
      const loadAllSkills = async () => {
        setLoadingAll(true);
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
        setLoadingAll(false);
      };

      loadAllSkills();
    }
  }, [selectedClientId, clients]);

  const displaySkills = selectedClientId === "all" ? allSkills : skills;
  const showSkeleton = selectedClientId === "all"
    ? loadingAll && allSkills.length === 0
    : isLoading && skills.length === 0 && selectedClientId;

  const toggleSelection = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(displaySkills.map((s) => s.path)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);

    try {
      if (selectedClientId === "all") {
        // Group skills by client for bulk delete
        const skillsByClient = new Map<string, string[]>();

        for (const path of selected) {
          const skill = allSkills.find(s => s.path === path);
          if (skill && skill.clientId) {
            const client = clients.find(c => c.id === skill.clientId);
            if (client && client.skillsPath) {
              if (!skillsByClient.has(client.skillsPath)) {
                skillsByClient.set(client.skillsPath, []);
              }
              skillsByClient.get(client.skillsPath)!.push(path);
            }
          }
        }

        // Delete skills for each client
        for (const [skillsPath, paths] of skillsByClient) {
          await deleteSkills(paths, skillsPath);
        }

        // Reload all skills
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
            console.error(`Failed to reload skills for ${client.name}:`, e);
          }
        }
        setAllSkills(skillsData);
      } else {
        // Single client deletion
        const selectedClient = clients.find((c) => c.id === selectedClientId);
        if (!selectedClient?.skillsPath) return;
        await deleteSkills(Array.from(selected), selectedClient.skillsPath);
      }

      // Show success toast
      const count = selected.size;
      showToast(`Deleted ${count} skill${count !== 1 ? "s" : ""}`);

      // Clean up state
      setSelected(new Set());
      setSelectionMode(false);
      setConfirmBulkDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onSelectClient("all")}
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
              selectedClientId === "all"
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            All
          </button>
          {clients.map((c) => (
            <button key={c.id} onClick={() => onSelectClient(c.id)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedClientId === c.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-text-muted border-border hover:border-border-hover hover:text-text"
              )}>{c.name}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={exitSelectionMode}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover"
              >
                Cancel
              </button>
              <button
                onClick={selected.size === displaySkills.length ? deselectAll : selectAll}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover"
              >
                {selected.size === displaySkills.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={selected.size === 0}
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete ({selected.size})
              </button>
            </>
          ) : (
            <>
              {displaySkills.length > 0 && (
                <button
                  onClick={() => setSelectionMode(true)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover"
                >
                  Select
                </button>
              )}
              <button
                onClick={onAdd}
                disabled={!canAdd || selectedClientId === "all"}
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Skill
              </button>
            </>
          )}
        </div>
      </div>
      {showSkeleton ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                <div className="h-3 w-24 rounded bg-surface-overlay" />
              </div>
              <div className="h-2 w-full rounded bg-surface-overlay" />
            </div>
          ))}
        </div>
      ) : displaySkills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-text-muted">No skills installed</p>
          <p className="text-[11px] text-text-muted/50">
            Browse the <span className="text-text">Discover</span> tab to install from the registry
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {displaySkills.map((s) => {
            const isAllView = selectedClientId === "all";
            const skillWithClient = s as InstalledSkill & { clientName?: string; clientId?: string };

            return (
              <div key={`${skillWithClient.clientId || ""}-${s.path}`} className="relative">
                <SkillCard
                  skill={s}
                  selectionMode={selectionMode}
                  selected={selected.has(s.path)}
                  onToggleSelect={() => toggleSelection(s.path)}
                  onOpenInFinder={onOpenInFinder}
                  onView={onView}
                  onCopyTo={onCopyTo}
                  onDelete={onDelete}
                />
                {isAllView && skillWithClient.clientName && (
                  <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      {skillWithClient.clientName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">Confirm Deletion</h2>
            </div>
            <div className="p-5">
              <p className="text-xs text-text-muted">
                Are you sure you want to delete {selected.size} skill{selected.size !== 1 ? "s" : ""}?
                This action cannot be undone.
              </p>
              {isDeleting && (
                <div className="mt-3 flex items-center gap-2 py-2 px-3 rounded-lg bg-red-400/5 border border-red-400/20">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "600ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "600ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "600ms" }} />
                  </div>
                  <span className="text-[11px] text-red-400 font-medium">Deleting skills...</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isDeleting}
                className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/15 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "600ms" }} />
                    <div className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "600ms" }} />
                    <div className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "600ms" }} />
                  </div>
                )}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscoverTab({
  clients,
  onInstalled,
}: {
  clients: ReturnType<typeof getSkillableClients>;
  onInstalled: (name: string, clientIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<SkillSearchResult | null>(null);
  const [installingSource, setInstallingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topPicks, setTopPicks] = useState<SkillSearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const searchCacheRef = useRef<Map<string, SkillSearchResult[]>>(new Map());
  const normalizedQuery = query.trim();
  const hasActiveQuery = normalizedQuery.length >= 2;

  useEffect(() => {
    invoke<SkillSearchResult[]>("get_featured_skills")
      .then(setTopPicks)
      .catch(() => {});
  }, []);
  const waitForNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Invalidate any in-flight search responses.
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
      // Ignore stale responses.
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
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const requestId = ++searchRequestIdRef.current;

    // If query is empty or too short, immediately clear results
    if (!hasActiveQuery) {
      setResults([]);
      setError(null);
      setSearching(false);
      return;
    }

    // Debounce the search
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

  const handleInstallConfirm = async (clientIds: string[], customPaths: string[] = []) => {
    if (!pendingInstall) return;
    const installSource = pendingInstall.id?.trim() || pendingInstall.source?.trim();
    if (!installSource) {
      throw new Error("Invalid skill source");
    }
    const sourcePattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)?$/;
    if (!sourcePattern.test(installSource)) {
      throw new Error("Invalid skill source format");
    }

    if (clientIds.length === 0 && customPaths.length === 0) {
      throw new Error("Please select at least one client or custom folder");
    }

    // Get target paths for selected clients plus any custom paths
    const targetPaths = [
      ...clientIds
        .map((id) => clients.find((c) => c.id === id))
        .filter((c) => c?.skillsPath)
        .map((c) => c!.skillsPath),
      ...customPaths,
    ];

    if (targetPaths.length === 0) {
      throw new Error("No valid client paths selected for installation");
    }

    setInstallingSource(pendingInstall.id);
    try {
      // Ensure card/button loader paints before backend install starts.
      await waitForNextFrame();
      const installedName = await invoke<string>("skills_install", {
        source: installSource,
        targetPaths,
        requestedName: pendingInstall.name,
      });
      onInstalled(installedName || pendingInstall.name, clientIds);
    } catch (e) {
      throw new Error(String(e));
    } finally {
      setInstallingSource(null);
    }
  };

  return (
    <div>
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
                  // Clear all pending operations
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                    debounceRef.current = null;
                  }
                  // Invalidate any in-flight search response.
                  searchRequestIdRef.current += 1;
                  // Clear all state
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

            // Hard reset search state as soon as query becomes too short.
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

            // Immediately switch to lightweight loading UI while typing
            // so large previous result grids do not re-render on each keystroke.
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
          placeholder="Search skills registry (e.g. react, git, debug)…"
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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text">Top Picks</p>
              <p className="text-[10px] text-text-muted/60 mt-0.5">Most installed skills from the registry</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["react", "firebase", "typescript", "python", "git"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border text-text-muted hover:border-primary/30 hover:text-primary transition-colors capitalize"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {topPicks.length > 0 ? (
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
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 rounded bg-surface-overlay w-3/4" />
                      <div className="h-2 rounded bg-surface-overlay w-1/2" />
                    </div>
                  </div>
                  <div className="h-8 rounded-md bg-surface-overlay" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <svg className="w-12 h-12 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

      {pendingInstall && (
        <InstallSkillDialog
          skill={pendingInstall}
          defaultClientIds={clients.length > 0 ? [clients[0].id] : []}
          onClose={() => setPendingInstall(null)}
          onInstall={handleInstallConfirm}
        />
      )}
    </div>
  );
}

function DeleteConfirmDialog({ skill, onConfirm, onCancel }: {
  skill: InstalledSkill; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-xs bg-surface border border-border rounded-xl shadow-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-text">Delete skill?</p>
          <p className="text-xs text-text-muted mt-1">"<span className="text-text">{skill.name}</span>" will be permanently removed from disk.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors">Cancel</button>
          <button onClick={onConfirm} className="text-xs font-medium px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default Skills;
