import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LayoutGrid, List, Eye, Copy, FolderOpen, Trash2, ChevronRight, Star } from "lucide-react";
import { cn } from "../lib/utils";
import { useSkillStore, getSkillableClients } from "../store/skillStore";
import { useClientStore } from "../store/clientStore";
import type { InstalledSkill } from "../store/skillStore";
import SkillCard from "../components/skills/SkillCard";
import CopySkillDialog from "../components/skills/CopySkillDialog";
import InstallSkillDialog from "../components/skills/InstallSkillDialog";
import AddSkillDialog from "../components/skills/AddSkillDialog";
import ViewSkillDialog from "../components/skills/ViewSkillDialog";
import RegistrySkillCard, { RegistrySkillListRow } from "../components/skills/RegistrySkillCard";
import type { SkillSearchResult } from "../components/skills/RegistrySkillCard";
import { useFavoritesStore } from "../store/skillStore";
import { ClientLogo } from "../components/skills/ClientLogo";

type Tab = "installed" | "favorites" | "discover";

function Skills() {
  const [tab, setTab] = useState<Tab>("installed");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<InstalledSkill | null>(null);
  const [copying, setCopying] = useState<InstalledSkill | null>(null);
  const [deleting, setDeleting] = useState<InstalledSkill | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toggle: toggleFavorite, isFavorite } = useFavoritesStore();

  const { clients: clientStates } = useClientStore();
  // Filter out false positives: clients marked as installed but whose binary doesn't actually exist
  // This happens when only config files exist (e.g. ~/.gemini/ or ~/.config/opencode/)
  const detectedMetas = clientStates
    .filter((cs) => cs.installed)
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
    invoke("log_audit_entry", {
      action: "skill_copy",
      clientId: null,
      clientName: null,
      detail: `Copied skill "${skill.name}" to ${targetClientIds.length} client${targetClientIds.length > 1 ? "s" : ""}`,
      configPath: null,
    }).catch(() => {});
    showToast(`"${skill.name}" copied to ${targetClientIds.length} client${targetClientIds.length > 1 ? "s" : ""}`);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    let skillsPath: string | undefined;
    const withClient = deleting as InstalledSkill & { clientId?: string };
    if (withClient.clientId) {
      skillsPath = clients.find((c) => c.id === withClient.clientId)?.skillsPath;
    } else if (selectedClientId !== "all" && selectedClient) {
      skillsPath = selectedClient.skillsPath;
    }
    if (!skillsPath) return;
    const deletedName = deleting.name;
    const deletedClient = clients.find((c) => c.skillsPath === skillsPath);
    await deleteSkill(deleting.path, skillsPath);
    if (isFavorite(deleting.path)) toggleFavorite(deleting.path);
    invoke("log_audit_entry", {
      action: "skill_delete",
      clientId: deletedClient?.id ?? null,
      clientName: deletedClient?.name ?? null,
      detail: `Deleted skill "${deletedName}"`,
      configPath: null,
    }).catch(() => {});
    setDeleting(null);
    showToast(`Deleted "${deletedName}"`);
  };

  const handleAddSkill = async (skillName: string, content: string) => {
    if (!selectedClientId || !selectedClient?.skillsPath) throw new Error("Select a client first");
    if (skills.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) {
      throw new Error("A skill with this name already exists for the selected client");
    }
    await writeSkill(selectedClient.skillsPath, skillName, content);
    invoke("log_audit_entry", {
      action: "skill_add",
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      detail: `Added skill "${skillName}"`,
      configPath: null,
    }).catch(() => {});
    showToast(`"${skillName}" added to ${selectedClient?.name ?? "selected client"}`);
  };

  const handleInstalled = (name: string, clientIds: string[]) => {
    if (clientIds.length > 0) {
      const firstClient = clients.find((c) => c.id === clientIds[0]);
      setSelectedClient(clientIds[0]);
      if (firstClient?.skillsPath) {
        loadSkills(firstClient.skillsPath, true);
      }
      showToast(`"${name}" installed for ${clientIds.length} client${clientIds.length > 1 ? "s" : ""}`);
      return;
    }
    showToast(`"${name}" installed globally`);
    if (selectedClientId && selectedClient?.skillsPath) {
      loadSkills(selectedClient.skillsPath, true);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Skills</h1>
        <p className="text-xs text-text-muted mt-0.5">Manage AI agent skills across clients</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border">
        {(["installed", "favorites", "discover"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("text-xs px-3 py-2 border-b-2 -mb-px transition-colors capitalize cursor-pointer focus:outline-none",
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
          refreshKey={refreshKey}
          onSaveSkill={async (skill: InstalledSkill, content: string) => { await writeSkill(skill.path.replace(/\/[^/]+$/, ""), skill.name, content); }}
        />
      )}
      {tab === "favorites" && (
        <FavoritesTab
          clients={clients}
          onOpenInFinder={handleOpenInFinder}
          onView={setViewing}
          onCopyTo={setCopying}
          onDelete={setDeleting}
          onSaveSkill={async (skill: InstalledSkill, content: string) => { await writeSkill(skill.path.replace(/\/[^/]+$/, ""), skill.name, content); }}
          onGoToDiscover={() => setTab("discover")}
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
          skillsPath={selectedClient.skillsPath}
          npxAgentId={selectedClient.npxAgentId}
          onClose={() => setAdding(false)}
          onCreate={handleAddSkill}
          onNpxInstall={() => selectedClient.skillsPath && loadSkills(selectedClient.skillsPath, true)}
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

function parseTableRow(line: string): string[] {
  return line.split("|").slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-+:?$/.test(c));
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="my-2 rounded-md bg-surface-overlay border border-border px-3 py-2 text-[10px] font-mono text-text overflow-x-auto">
          {lang && <span className="text-text-muted/50 text-[9px] block mb-1">{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map(parseTableRow);
      const headerRow = rows[0] ?? [];
      const dataRows = rows.filter((_, idx) => idx > 0 && !isSeparatorRow(rows[idx]));
      elements.push(
        <div key={i} className="my-2 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                {headerRow.map((cell, j) => (
                  <th key={j} className="border border-border px-2.5 py-1.5 text-left font-semibold text-text bg-surface-overlay">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-surface" : "bg-surface-overlay/40"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border px-2.5 py-1.5 text-text-muted">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-[11px] font-bold text-text mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xs font-bold text-text mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-sm font-bold text-text mt-4 mb-1">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-1.5 text-[11px] text-text leading-relaxed">
          <span className="text-text-muted flex-shrink-0 mt-px">•</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={i} className="text-[11px] text-text leading-relaxed">
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    }
    i++;
  }
  return elements;
}

function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return content;
  const after = trimmed.slice(3);
  const close = after.indexOf("\n---");
  if (close === -1) return content;
  return after.slice(close + 4).trimStart();
}

function ContentPanel({ content, onSave, onDirtyChange }: {
  content: string;
  onSave: (updated: string) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [mode, setMode] = useState<"raw" | "preview">("raw");
  const [edited, setEdited] = useState(content);
  const [baseline, setBaseline] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isDirty = edited !== baseline;

  // Reset when skill changes
  React.useEffect(() => { setEdited(content); setBaseline(content); setSaveError(null); setSaved(false); }, [content]);

  // Notify parent of dirty state
  React.useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(edited);
      setBaseline(edited);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEdited(baseline);
    setSaveError(null);
  };

  // Cmd+S / Ctrl+S to save
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) handleSave();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [isDirty, saving, edited]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode("raw")}
            className={cn("px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer", mode === "raw" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text")}
          >Raw</button>
          <button
            onClick={() => setMode("preview")}
            className={cn("px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer", mode === "preview" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text")}
          >Preview</button>
        </div>
        <div className="flex items-center gap-2">
          {saveError && <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={saveError}>Error: {saveError}</span>}
          {isDirty && mode === "raw" && (
            <button
              onClick={handleDiscard}
              className="px-2.5 py-1 rounded text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer focus:outline-none"
            >Discard</button>
          )}
          {(isDirty || saved) && mode === "raw" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn("px-2.5 py-1 rounded text-[11px] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed", saved ? "bg-green-500/15 text-green-400" : "bg-primary/15 text-primary hover:bg-primary/25")}
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {mode === "raw"
          ? <textarea
              ref={textareaRef}
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              className="w-full h-full p-4 text-[11px] font-mono text-text leading-relaxed bg-transparent resize-none outline-none"
              spellCheck={false}
            />
          : <div className="h-full overflow-y-auto p-4 space-y-0.5">{renderMarkdown(stripFrontmatter(edited))}</div>
        }
      </div>
    </div>
  );
}

function FavoritesTab({ clients, onOpenInFinder, onView, onCopyTo, onDelete, onSaveSkill, onGoToDiscover }: {
  clients: ReturnType<typeof getSkillableClients>;
  onOpenInFinder: (s: InstalledSkill) => void;
  onView: (s: InstalledSkill) => void;
  onCopyTo: (s: InstalledSkill) => void;
  onDelete: (s: InstalledSkill) => void;
  onSaveSkill: (skill: InstalledSkill, content: string) => Promise<void>;
  onGoToDiscover: () => void;
}) {
  const { favorites } = useFavoritesStore();
  const [allSkills, setAllSkills] = useState<Array<InstalledSkill & { clientName: string; clientId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [activeSkill, setActiveSkill] = useState<InstalledSkill | null>(null);
  const isPanelDirty = React.useRef(false);

  const trySetActiveSkill = (s: InstalledSkill) => {
    if (isPanelDirty.current && activeSkill?.path !== s.path) {
      if (!window.confirm("You have unsaved changes. Discard and switch skill?")) return;
    }
    setActiveSkill(s);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result: Array<InstalledSkill & { clientName: string; clientId: string }> = [];
      for (const client of clients) {
        if (!client.skillsPath) continue;
        try {
          const skills = await invoke<InstalledSkill[]>("list_skills", { skillsPath: client.skillsPath });
          result.push(...skills.map((s) => ({ ...s, clientName: client.name, clientId: client.id })));
        } catch { /* skip client */ }
      }
      setAllSkills(result);
      setLoading(false);
    };
    load();
  }, [clients]);

  useEffect(() => {
    if (viewMode === "list" && !activeSkill && favorited.length > 0) {
      setActiveSkill(favorited[0]);
    }
  }, [viewMode]);

  const favorited = allSkills.filter((s) => favorites.has(s.path));

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-pulse">
            <div className="h-3 w-24 rounded bg-surface-overlay" />
            <div className="h-2 w-full rounded bg-surface-overlay" />
          </div>
        ))}
      </div>
    );
  }

  if (favorited.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Star size={28} className="text-text-muted/30" />
        <p className="text-sm font-medium text-text-muted">No favorites yet</p>
        <p className="text-xs text-text-muted/60">Click the star icon on any skill card to add it here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Heading + Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Favourite Skills</h2>
          <p className="text-[11px] text-text-muted/60 mt-0.5">{favorited.length} skill{favorited.length !== 1 ? "s" : ""} saved</p>
        </div>
        <div className="flex items-center justify-end">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("card")}
              className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "card" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
              title="Card view"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "list" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
              title="List view"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "card" ? (
        <div className="grid grid-cols-3 gap-3">
          {favorited.map((s) => (
            <SkillCard
              key={s.path}
              skill={s}
              clientName={s.clientName}
              clientId={(s as any).clientId}
              onOpenInFinder={onOpenInFinder}
              onView={onView}
              onCopyTo={onCopyTo}
              onDelete={onDelete}
            />
          ))}
          <button
            onClick={onGoToDiscover}
            className="rounded-xl border border-dashed border-border hover:border-primary/40 bg-transparent hover:bg-primary/5 flex flex-col items-center justify-center gap-2 p-6 transition-all group cursor-pointer min-h-[140px]"
          >
            <div className="w-8 h-8 rounded-lg border border-dashed border-border group-hover:border-primary/40 flex items-center justify-center transition-colors">
              <Star size={14} className="text-text-muted/40 group-hover:text-primary/60 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-text-muted/60 group-hover:text-text-muted transition-colors">Discover more skills</p>
              <p className="text-[10px] text-text-muted/40 mt-0.5">Browse the registry to find and star skills</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex rounded-lg border border-border overflow-hidden" style={{ height: "calc(100vh - 260px)" }}>
          {/* Left: skill list */}
          <div className="w-56 flex-shrink-0 border-r border-border bg-surface overflow-y-auto">
            {favorited.map((s) => {
              const isActive = activeSkill?.path === s.path;
              return (
                <div
                  key={s.path}
                  onClick={() => trySetActiveSkill(s)}
                  className={cn(
                    "px-3 py-2.5 border-b border-border/50 transition-colors cursor-pointer",
                    isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-overlay"
                  )}
                >
                  <p className="text-xs font-medium truncate">{s.name}</p>
                  <p className="text-[10px] text-text-muted/60 truncate mt-0.5">{s.clientName}</p>
                </div>
              );
            })}
          </div>

          {/* Right: content panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-base">
            {activeSkill ? (
              <>
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text">{activeSkill.name}</p>
                      {activeSkill.version && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-text-muted font-mono">
                          v{activeSkill.version}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-text-muted/60 mt-0.5 truncate max-w-xs">{activeSkill.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onView(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="View in dialog"><Eye size={13} /></button>
                    <button onClick={() => onOpenInFinder(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer" title="Open in Finder"><FolderOpen size={13} /></button>
                    <button onClick={() => onCopyTo(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors cursor-pointer" title="Copy to clients"><Copy size={13} /></button>
                    <button onClick={() => onDelete(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                <ContentPanel
                  content={activeSkill.raw_content}
                  onSave={(updated) => onSaveSkill(activeSkill, updated)}
                  onDirtyChange={(dirty) => { isPanelDirty.current = dirty; }}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-text-muted">Select a skill to view its content</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InstalledTab({ clients, selectedClientId, skills, isLoading, onSelectClient, onAdd, canAdd, onOpenInFinder, onView, onCopyTo, onDelete, deleteSkills, showToast, refreshKey, onSaveSkill }: {
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
  refreshKey: number;
  onSaveSkill: (skill: InstalledSkill, content: string) => Promise<void>;
}) {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [activeSkill, setActiveSkill] = useState<InstalledSkill | null>(null);
  const isPanelDirty = React.useRef(false);

  const trySetActiveSkill = (s: InstalledSkill) => {
    if (isPanelDirty.current && activeSkill?.path !== s.path) {
      if (!window.confirm("You have unsaved changes. Discard and switch skill?")) return;
    }
    setActiveSkill(s);
  };
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
  }, [selectedClientId, clients, refreshKey]);

  const displaySkills = selectedClientId === "all" ? allSkills : skills;

  useEffect(() => {
    if (viewMode === "list" && !activeSkill && displaySkills.length > 0) {
      setActiveSkill(displaySkills[0]);
    }
  }, [viewMode, displaySkills.length]);

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
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
              selectedClientId === "all"
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            All
          </button>
          {clients.map((c) => (
            <button key={c.id} onClick={() => onSelectClient(c.id)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer flex items-center gap-1.5",
                selectedClientId === c.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-text-muted border-border hover:border-border-hover hover:text-text"
              )}>
              <ClientLogo clientId={c.id} clientName={c.name} size={14} />
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={exitSelectionMode}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={selected.size === displaySkills.length ? deselectAll : selectAll}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover cursor-pointer"
              >
                {selected.size === displaySkills.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={selected.size === 0}
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Delete ({selected.size})
              </button>
            </>
          ) : (
            <>
              {displaySkills.length > 0 && (
                <button
                  onClick={() => setSelectionMode(true)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:border-border-hover cursor-pointer"
                >
                  Select
                </button>
              )}
              {selectedClientId !== "all" && (
                <button
                  onClick={onAdd}
                  disabled={!canAdd}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Add Skill
                </button>
              )}
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode("card")}
                  className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "card" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
                  title="Card view"
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "list" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
                  title="List view"
                >
                  <List size={13} />
                </button>
              </div>
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
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-3 gap-3">
          {displaySkills.map((s) => {
            const isAllView = selectedClientId === "all";
            const skillWithClient = s as InstalledSkill & { clientName?: string; clientId?: string };
            return (
              <SkillCard
                key={`${skillWithClient.clientId || ""}-${s.path}`}
                skill={s}
                clientName={isAllView ? skillWithClient.clientName : undefined}
                clientId={isAllView ? skillWithClient.clientId : undefined}
                selectionMode={selectionMode}
                selected={selected.has(s.path)}
                onToggleSelect={() => toggleSelection(s.path)}
                onOpenInFinder={onOpenInFinder}
                onView={onView}
                onCopyTo={onCopyTo}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      ) : (
        /* List view — sidebar + content panel inspired by the screenshot */
        <div className="flex rounded-lg border border-border overflow-hidden" style={{ height: "calc(100vh - 260px)" }}>
          {/* Left: skill list */}
          <div className="w-56 flex-shrink-0 border-r border-border bg-surface overflow-y-auto">
            {displaySkills.map((s) => {
              const skillWithClient = s as InstalledSkill & { clientName?: string; clientId?: string };
              const isActive = activeSkill?.path === s.path;
              const isSelected = selected.has(s.path);
              return (
                <div
                  key={`${skillWithClient.clientId || ""}-${s.path}`}
                  onClick={() => selectionMode ? toggleSelection(s.path) : trySetActiveSkill(s)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors cursor-pointer flex items-center gap-2",
                    selectionMode
                      ? isSelected ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-overlay"
                      : isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-overlay"
                  )}
                >
                  {selectionMode && (
                    <div className={cn(
                      "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{s.name}</p>
                    {skillWithClient.clientName && (
                      <p className="text-[10px] text-text-muted/60 truncate mt-0.5">{skillWithClient.clientName}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: content panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-base">
            {activeSkill ? (
              <>
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text">{activeSkill.name}</p>
                      {activeSkill.version && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-text-muted font-mono">
                          v{activeSkill.version}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-text-muted/60 mt-0.5 truncate max-w-xs">{activeSkill.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onView(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="View in dialog"><Eye size={13} /></button>
                    <button onClick={() => onOpenInFinder(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer" title="Open in Finder"><FolderOpen size={13} /></button>
                    <button onClick={() => onCopyTo(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors cursor-pointer" title="Copy to clients"><Copy size={13} /></button>
                    <button onClick={() => onDelete(activeSkill)} className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                {/* Raw / Preview toggle + content */}
                <ContentPanel
                  content={activeSkill.raw_content}
                  onSave={(updated) => onSaveSkill(activeSkill, updated)}
                  onDirtyChange={(dirty) => { isPanelDirty.current = dirty; }}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-text-muted">Select a skill to view its content</p>
              </div>
            )}
          </div>
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
                className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/15 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
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

    // Split selected clients: npx-capable vs file-copy
    const selectedClients = clientIds.map((id) => clients.find((c) => c.id === id)).filter(Boolean);
    const npxAgentIds = selectedClients.filter((c) => c!.npxAgentId).map((c) => c!.npxAgentId!);
    const npxFallbackPaths = selectedClients
      .filter((c) => c!.npxAgentId && c!.skillsPath)
      .map((c) => c!.skillsPath!);
    const targetPaths = [
      ...selectedClients.filter((c) => !c!.npxAgentId && c!.skillsPath).map((c) => c!.skillsPath!),
      ...customPaths,
    ];

    if (npxAgentIds.length === 0 && targetPaths.length === 0) {
      throw new Error("No valid client paths selected for installation");
    }

    setInstallingSource(pendingInstall.id);
    try {
      // Ensure card/button loader paints before backend install starts.
      await waitForNextFrame();
      const installedName = await invoke<string>("skills_install", {
        source: installSource,
        targetPaths,
        npxAgentIds,
        npxFallbackPaths,
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
      <div className="relative mb-5 flex items-center gap-2">
        <div className="relative flex-1">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors cursor-pointer"
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
        <div className="flex items-center rounded-lg border border-border overflow-hidden flex-shrink-0">
          <button
            onClick={() => setViewMode("card")}
            className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "card" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
            title="Card view"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-1.5 transition-colors cursor-pointer", viewMode === "list" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text")}
            title="List view"
          >
            <List size={13} />
          </button>
        </div>
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
        viewMode === "card" ? (
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
        ) : (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface px-4 py-3 flex items-center gap-4 animate-pulse">
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-32 rounded bg-surface-overlay" />
                  <div className="h-2 w-64 rounded bg-surface-overlay" />
                </div>
                <div className="w-14 h-6 rounded-md bg-surface-overlay flex-shrink-0" />
              </div>
            ))}
          </div>
        )
      ) : !hasActiveQuery ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-semibold text-text">Bundles</p>
              <p className="text-[10px] text-text-muted/60 mt-0.5">Curated skill collections from trusted sources</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["react", "firebase", "typescript", "python", "git"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border text-text-muted hover:border-primary/30 hover:text-primary transition-colors capitalize cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {topPicks.length > 0 ? (
            <BundleList
              skills={topPicks}
              installingSource={installingSource}
              onInstall={setPendingInstall}
              viewMode={viewMode}
            />
          ) : (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-surface-overlay" />
                    <div className="h-3 w-32 rounded bg-surface-overlay" />
                    <div className="ml-auto h-2.5 w-16 rounded bg-surface-overlay" />
                  </div>
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
        viewMode === "card" ? (
          <div key={normalizedQuery} className="grid grid-cols-3 gap-3">
            {renderedResultCards}
          </div>
        ) : (
          <div key={normalizedQuery} className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
            {results.map((s) => (
              <RegistrySkillListRow key={s.id} skill={s} installing={installingSource === s.id} onInstall={setPendingInstall} />
            ))}
          </div>
        )
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

function BundleList({
  skills,
  installingSource,
  onInstall,
  viewMode,
}: {
  skills: SkillSearchResult[];
  installingSource: string | null;
  onInstall: (skill: SkillSearchResult) => void;
  viewMode: "card" | "list";
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, SkillSearchResult[]>();
    for (const skill of skills) {
      const src = skill.source ?? "unknown";
      if (!map.has(src)) map.set(src, []);
      map.get(src)!.push(skill);
    }
    return Array.from(map.entries());
  }, [skills]);

  const [openBundles, setOpenBundles] = useState<Set<string>>(
    () => new Set(grouped.length > 0 ? [grouped[0][0]] : [])
  );

  type VersionCheck = { installed_version: string | null; remote_version: string | null; has_update: boolean };
  const [versionChecks, setVersionChecks] = useState<Map<string, VersionCheck>>(new Map());

  useEffect(() => {
    grouped.forEach(([source]) => {
      invoke<VersionCheck>("check_bundle_version", { source })
        .then((result) => setVersionChecks((prev) => new Map(prev).set(source, result)))
        .catch(() => {});
    });
  }, [grouped.length]);

  const toggle = (src: string) => {
    setOpenBundles((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {grouped.map(([source, bundleSkills]) => {
        const isOpen = openBundles.has(source);
        const slashIdx = source.indexOf("/");
        const org = slashIdx !== -1 ? source.slice(0, slashIdx) : "";
        const repo = slashIdx !== -1 ? source.slice(slashIdx + 1) : source;
        const displayName = repo.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const avatarLetter = repo[0]?.toUpperCase() ?? "S";
        const versionCheck = versionChecks.get(source);

        return (
          <div key={source} className="rounded-xl border border-border overflow-hidden">
            {/* Bundle header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-surface hover:bg-surface-overlay transition-colors">
              <button
                onClick={() => toggle(source)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{avatarLetter}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-text">{displayName}</p>
                    {versionCheck?.remote_version && (
                      <span className="text-[9px] font-mono text-text-muted/40">v{versionCheck.remote_version}</span>
                    )}
                    {versionCheck?.has_update && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-cyan/10 border border-cyan/30 text-cyan">update</span>
                    )}
                  </div>
                  {org && <p className="text-[10px] text-text-muted/50 mt-0.5">{source}</p>}
                </div>
              </button>
              <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-overlay border border-border text-text-muted">
                {bundleSkills.length} skills
              </span>
              <button
                onClick={() => onInstall({ id: source, name: "", source })}
                className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors cursor-pointer"
              >
                Install All
              </button>
              <ChevronRight
                size={13}
                onClick={() => toggle(source)}
                className={cn("text-text-muted transition-transform flex-shrink-0 cursor-pointer", isOpen && "rotate-90")}
              />
            </div>

            {/* Skills rows */}
            {isOpen && (
              viewMode === "card" ? (
                <div className="border-t border-border p-3 grid grid-cols-3 gap-3">
                  {bundleSkills.map((s) => (
                    <RegistrySkillCard
                      key={s.id}
                      skill={s}
                      installing={installingSource === s.id}
                      onInstall={onInstall}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-t border-border divide-y divide-border/40">
                  {bundleSkills.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 px-4 py-3 bg-surface hover:bg-surface-overlay transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text">{s.name}</p>
                        {s.description && (
                          <p className="text-[11px] text-text-muted/60 truncate mt-0.5">{s.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onInstall(s)}
                        disabled={installingSource === s.id}
                        className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-md border border-border text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {installingSource === s.id ? "Installing…" : "Install"}
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
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
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="text-xs font-medium px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default Skills;
