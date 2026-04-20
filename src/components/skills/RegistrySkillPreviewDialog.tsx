import { useState, useEffect } from "react";
import { X, Copy } from "lucide-react";
import type { SkillSearchResult } from "./RegistrySkillCard";

interface Props {
  skill: SkillSearchResult;
  onClose: () => void;
  onInstall: (skill: SkillSearchResult) => void;
}

function parseOwnerRepo(id: string, source?: string): { owner: string; repo: string; skillName: string | null } | null {
  // id: "owner/repo/skill-name" or "owner/repo"
  const idParts = id.split("/").filter(p => Boolean(p) && p !== ".." && p !== ".");
  if (idParts.length >= 2) {
    return {
      owner: idParts[0],
      repo: idParts[1],
      skillName: idParts.length >= 3 ? idParts[2] : null,
    };
  }
  // fallback: parse source URL
  if (source) {
    const clean = source
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/^https?:\/\/raw\.githubusercontent\.com\//, "")
      .replace(/\.git$/, "");
    const parts = clean.split("/").filter(p => Boolean(p) && p !== ".." && p !== ".");
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1], skillName: null };
  }
  return null;
}

// jsDelivr mirrors GitHub with no rate limits and no auth required.
// URL format: https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}
async function findSkillMd(id: string, source?: string): Promise<string> {
  const parsed = parseOwnerRepo(id, source);
  if (!parsed) throw new Error("Cannot determine GitHub owner/repo from skill id.");

  const { owner, repo } = parsed;

  // Derive skillName: from parsed result, or from the id itself when the id
  // is just the skill name (no owner/repo prefix, e.g. "react:components").
  let skillName = parsed.skillName;
  if (!skillName) {
    const sourcePrefix = source ? source.replace(/^https?:\/\/[^/]+\//, "").replace(/\.git$/, "") + "/" : "";
    if (sourcePrefix && id.startsWith(sourcePrefix)) {
      skillName = id.slice(sourcePrefix.length) || null;
    } else if (!id.includes("/")) {
      // id is just the bare skill name
      skillName = id;
    }
  }

  // Build candidate paths. For colon-namespaced names like "react:components"
  // also try slash and dash variants so we cover different repo layouts.
  const paths: string[] = [];
  if (skillName) {
    const variants = [...new Set([
      skillName,
      skillName.replace(/:/g, "/"),
      skillName.replace(/:/g, "-"),
    ])];
    for (const v of variants) {
      paths.push(`skills/${v}/SKILL.md`);
      paths.push(`${v}/SKILL.md`);
    }
  }
  paths.push("SKILL.md");

  for (const path of paths) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const url = `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}@main/${encodedPath}`;
    try {
      const r = await fetch(url);
      if (r.ok) return r.text();
    } catch { /* try next */ }
  }

  throw new Error(`No SKILL.md found in ${owner}/${repo} for skill "${skillName ?? "root"}".`);
}

export default function RegistrySkillPreviewDialog({ skill, onClose, onInstall }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    findSkillMd(skill.id, skill.source)
      .then((text: string) => { setContent(text); setLoading(false); })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, [skill.id, skill.source]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-3xl rounded-xl border border-border bg-surface shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(90vh)" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text">{skill.name}</h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {skill.id}
              {skill.installs != null && skill.installs > 0 && (
                <span className="ml-2 text-text-muted/50">· {skill.installs.toLocaleString()} installs</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <div className="w-4 h-4 border border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-text-muted">Fetching SKILL.md…</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 space-y-1">
              <p className="text-xs text-red-400 font-medium">Failed to load content</p>
              <pre className="text-[11px] text-red-400/70 whitespace-pre-wrap break-all">{error}</pre>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-[11px] font-mono text-text leading-relaxed">
              {content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-primary">{copied ? "Copied!" : ""}</span>
          <div className="flex items-center gap-2">
            {content && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
              >
                <Copy size={12} />
                Copy
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onInstall(skill); }}
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
