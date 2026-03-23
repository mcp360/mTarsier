import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../lib/utils";
import { useSkillStore, getSkillableClients } from "../store/skillStore";
import type { InstalledSkill } from "../store/skillStore";
import SkillCard from "../components/skills/SkillCard";
import CopySkillDialog from "../components/skills/CopySkillDialog";
import InstallSkillDialog from "../components/skills/InstallSkillDialog";
import RegistrySkillCard from "../components/skills/RegistrySkillCard";
import type { SkillSearchResult } from "../components/skills/RegistrySkillCard";

type Tab = "installed" | "discover";

function Skills() {
  const [tab, setTab] = useState<Tab>("installed");
  const [copying, setCopying] = useState<InstalledSkill | null>(null);
  const [deleting, setDeleting] = useState<InstalledSkill | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const clients = getSkillableClients();
  const { selectedClientId, skills, isLoading, setSelectedClient, writeSkill, deleteSkill } = useSkillStore();

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) setSelectedClient(clients[0].id);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenInFinder = async (skill: InstalledSkill) => {
    try { await invoke("reveal_in_finder", { path: skill.path }); }
    catch (e) { showToast(String(e)); }
  };

  const handleCopySkill = async (targetClientIds: string[], skill: InstalledSkill) => {
    for (const id of targetClientIds) await writeSkill(id, skill.name, skill.rawContent);
    showToast(`"${skill.name}" copied to ${targetClientIds.length} client${targetClientIds.length > 1 ? "s" : ""}`);
  };

  const handleDelete = async () => {
    if (!deleting || !selectedClientId) return;
    await deleteSkill(deleting.path, selectedClientId);
    setDeleting(null);
    showToast(`Deleted "${deleting.name}"`);
  };

  const handleInstalled = (name: string) => {
    showToast(`"${name}" installed globally`);
    if (selectedClientId) setSelectedClient(selectedClientId);
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

      {tab === "installed" ? (
        <InstalledTab
          clients={clients} selectedClientId={selectedClientId}
          skills={skills} isLoading={isLoading}
          onSelectClient={setSelectedClient}
          onOpenInFinder={handleOpenInFinder}
          onCopyTo={setCopying} onDelete={setDeleting}
        />
      ) : (
        <DiscoverTab onInstalled={handleInstalled} />
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

function InstalledTab({ clients, selectedClientId, skills, isLoading, onSelectClient, onOpenInFinder, onCopyTo, onDelete }: {
  clients: ReturnType<typeof getSkillableClients>;
  selectedClientId: string | null;
  skills: InstalledSkill[];
  isLoading: boolean;
  onSelectClient: (id: string) => void;
  onOpenInFinder: (s: InstalledSkill) => void;
  onCopyTo: (s: InstalledSkill) => void;
  onDelete: (s: InstalledSkill) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {clients.map((c) => (
          <button key={c.id} onClick={() => onSelectClient(c.id)}
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
              selectedClientId === c.id
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-text-muted border-border hover:border-border-hover hover:text-text"
            )}>{c.name}</button>
        ))}
      </div>
      {isLoading ? (
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
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-text-muted">No skills installed</p>
          <p className="text-[11px] text-text-muted/50">
            Browse the <span className="text-text">Discover</span> tab to install from the registry
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {skills.map((s) => (
            <SkillCard key={s.path} skill={s}
              onOpenInFinder={onOpenInFinder} onCopyTo={onCopyTo} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscoverTab({ onInstalled }: { onInstalled: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<SkillSearchResult | null>(null);
  const [installingSource, setInstallingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    setError(null);
    try {
      const res = await invoke<SkillSearchResult[]>("skills_search", { query: q.trim() });
      setResults(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => runSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleInstallConfirm = async (_clientIds: string[]) => {
    if (!pendingInstall) return;
    const source = pendingInstall.source ?? pendingInstall.id;
    setInstallingSource(source);
    try {
      await invoke("skills_install", { source });
      onInstalled(pendingInstall.name);
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
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); runSearch(query); } }}
          placeholder="Search skills registry (e.g. react, git, debug)…"
          className="w-full pl-9 pr-8 py-2 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/40"
        />
      </div>

      {error && <p className="text-[11px] text-red-400 mb-4">{error}</p>}

      {results.length === 0 && !searching && query.trim().length < 2 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-text-muted">Search the skills.sh registry</p>
          <p className="text-[11px] text-text-muted/50">Type at least 2 characters to search</p>
        </div>
      ) : results.length === 0 && !searching ? (
        <div className="py-16 text-center">
          <p className="text-sm text-text-muted">No results for "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {results.map((s) => (
            <RegistrySkillCard key={s.source ?? s.id} skill={s}
              installing={installingSource === (s.source ?? s.id)}
              onInstall={setPendingInstall}
            />
          ))}
        </div>
      )}

      {pendingInstall && (
        <InstallSkillDialog
          skill={pendingInstall}
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
