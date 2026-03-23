import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../lib/utils";
import { useSkillStore, getSkillableClients } from "../store/skillStore";
import type { InstalledSkill } from "../store/skillStore";
import SkillCard from "../components/skills/SkillCard";
import CopySkillDialog from "../components/skills/CopySkillDialog";

function Skills() {
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
    try {
      await invoke("reveal_in_finder", { path: skill.path });
    } catch (e) {
      showToast(String(e));
    }
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Skills</h1>
        <p className="text-xs text-text-muted mt-0.5">Manage AI agent skills across clients</p>
      </div>

      {/* Client selector */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClient(c.id)}
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

      {/* Skills grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                <div className="h-3 w-24 rounded bg-surface-overlay" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-surface-overlay" />
                <div className="h-2 w-2/3 rounded bg-surface-overlay" />
              </div>
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-text-muted">No skills installed</p>
          <p className="text-[11px] text-text-muted/50">
            Add skill directories to <span className="font-mono">{clients.find((c) => c.id === selectedClientId)?.skillsPath ?? "…"}</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {skills.map((s) => (
            <SkillCard
              key={s.path}
              skill={s}
              onOpenInFinder={handleOpenInFinder}
              onCopyTo={setCopying}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {copying && selectedClientId && (
        <CopySkillDialog
          skill={copying}
          sourceClientId={selectedClientId}
          onClose={() => setCopying(null)}
          onCopy={handleCopySkill}
        />
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

function DeleteConfirmDialog({ skill, onConfirm, onCancel }: {
  skill: InstalledSkill;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-xs bg-surface border border-border rounded-xl shadow-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-text">Delete skill?</p>
          <p className="text-xs text-text-muted mt-1">
            "<span className="text-text">{skill.name}</span>" will be permanently removed from disk.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="text-xs font-medium px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default Skills;
