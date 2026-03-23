import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { getSkillableClients } from "../../store/skillStore";
import type { InstalledSkill } from "../../store/skillStore";

interface Props {
  skill: InstalledSkill;
  sourceClientId: string;
  onClose: () => void;
  onCopy: (targetClientIds: string[], skill: InstalledSkill) => Promise<void>;
}

export default function CopySkillDialog({ skill, sourceClientId, onClose, onCopy }: Props) {
  const clients = getSkillableClients().filter((c) => c.id !== sourceClientId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    if (selected.size === 0) { setError("Select at least one target client"); return; }
    setCopying(true);
    setError(null);
    try {
      await onCopy(Array.from(selected), skill);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Copy Skill to Clients</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-border bg-base p-3 space-y-1">
            <p className="text-xs font-semibold text-text">{skill.name}</p>
            {skill.description && (
              <p className="text-[11px] text-text-muted leading-relaxed">{skill.description}</p>
            )}
          </div>

          {clients.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No other skill-compatible clients available.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Copy to</p>
              <div className="space-y-1.5">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors flex items-center justify-between",
                      selected.has(c.id)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-text-muted hover:border-border-hover hover:text-text"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-text-muted/50 font-mono">{c.skillsPath?.replace("~", "~")}</span>
                    {selected.has(c.id) && (
                      <svg className="w-3 h-3 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text transition-colors">
            Cancel
          </button>
          {clients.length > 0 && (
            <button
              onClick={handleCopy}
              disabled={copying || selected.size === 0}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 disabled:opacity-50 transition-colors"
            >
              {copying ? "Copying…" : `Copy to ${selected.size || ""} client${selected.size !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
