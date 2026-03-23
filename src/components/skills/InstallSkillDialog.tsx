import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { getSkillableClients } from "../../store/skillStore";
import type { SkillSearchResult } from "./RegistrySkillCard";

interface Props {
  skill: SkillSearchResult;
  onClose: () => void;
  onInstall: (clientIds: string[]) => Promise<void>;
}

export default function InstallSkillDialog({ skill, onClose, onInstall }: Props) {
  const clients = getSkillableClients();
  const [selected, setSelected] = useState<Set<string>>(new Set(clients.map((c) => c.id)));
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleInstall = async () => {
    if (selected.size === 0) { setError("Select at least one client"); return; }
    setInstalling(true);
    setError(null);
    try {
      await onInstall(Array.from(selected));
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Install Skill</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-border bg-base p-3 space-y-0.5">
            <p className="text-xs font-semibold text-text">{skill.name}</p>
            {skill.source && (
              <p className="text-[10px] font-mono text-text-muted/60 truncate">{skill.source}</p>
            )}
            {skill.installs != null && skill.installs > 0 && (
              <p className="text-[10px] text-text-muted/40">{skill.installs.toLocaleString()} installs</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Install to</p>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === clients.length
                      ? new Set()
                      : new Set(clients.map((c) => c.id))
                  )
                }
                className="text-[10px] text-primary hover:underline"
              >
                {selected.size === clients.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-2",
                    selected.has(c.id)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-text-muted hover:border-border-hover hover:text-text"
                  )}
                >
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[10px] text-text-muted/40 font-mono truncate max-w-[120px]">{c.skillsPath}</span>
                  {selected.has(c.id) && (
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-text-muted/40 leading-relaxed">
            Installed via <span className="font-mono">npx skills</span> to{" "}
            <span className="font-mono">~/.agents/skills</span> — shared across clients via symlink.
          </p>

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors">
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={installing || selected.size === 0}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 disabled:opacity-50 transition-colors"
          >
            {installing
              ? "Installing…"
              : `Install to ${selected.size} client${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
