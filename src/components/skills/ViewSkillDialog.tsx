import { useState } from "react";
import { X, Copy } from "lucide-react";
import type { InstalledSkill } from "../../store/skillStore";

interface Props {
  skill: InstalledSkill;
  onClose: () => void;
}

export default function ViewSkillDialog({ skill, onClose }: Props) {
  const [copying, setCopying] = useState(false);
  const [copyState, setCopyState] = useState<"success" | "error" | null>(null);

  const handleCopy = async () => {
    setCopying(true);
    setCopyState(null);
    try {
      await navigator.clipboard.writeText(skill.raw_content);
      setCopyState("success");
    } catch {
      setCopyState("error");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-3xl rounded-xl border border-border bg-surface shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(90vh)" }}
      >
        {/* Header — fixed */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text">View Skill</h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Read-only preview of this skill file
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-text">
            <X size={16} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-lg border border-border bg-base p-3 space-y-1">
            <p className="text-xs font-semibold text-text">{skill.name}</p>
            {skill.description ? (
              <p className="text-[11px] text-text-muted leading-relaxed">{skill.description}</p>
            ) : (
              <p className="text-[11px] text-text-muted/50 italic">No description</p>
            )}
            <p className="pt-1 text-[10px] font-mono text-text-muted/70 break-all">{skill.path}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              SKILL.md content
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-base p-3 text-[11px] text-text leading-relaxed">
              {skill.raw_content}
            </pre>
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <div className="text-[11px]">
            {copyState === "success" && (
              <span className="text-primary">Copied SKILL.md content</span>
            )}
            {copyState === "error" && (
              <span className="text-red-400">Failed to copy content</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={12} />
              {copying ? "Copying..." : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:text-text"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
