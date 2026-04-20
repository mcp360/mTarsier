import { useState } from "react";
import { X, Copy } from "lucide-react";
import { cn } from "../../lib/utils";
import type { InstalledSkill } from "../../store/skillStore";

interface Props {
  skill: InstalledSkill;
  onClose: () => void;
}

function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return content;
  const after = trimmed.slice(3);
  const close = after.indexOf("\n---");
  if (close === -1) return content;
  return after.slice(close + 4).trimStart();
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

export default function ViewSkillDialog({ skill, onClose }: Props) {
  const [mode, setMode] = useState<"raw" | "preview">("preview");
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
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text">{skill.name}</h2>
            <p className="mt-0.5 text-[11px] text-text-muted break-all">{skill.path}</p>
          </div>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-text cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex-shrink-0 flex items-center gap-1 border-b border-border px-5 py-2">
          <button
            onClick={() => setMode("preview")}
            className={cn("px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer", mode === "preview" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text")}
          >
            Preview
          </button>
          <button
            onClick={() => setMode("raw")}
            className={cn("px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer", mode === "raw" ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text")}
          >
            Raw
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {mode === "preview" ? (
            <div className="space-y-0.5">
              {renderMarkdown(stripFrontmatter(skill.raw_content))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-[11px] font-mono text-text leading-relaxed">
              {skill.raw_content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <div className="text-[11px]">
            {copyState === "success" && <span className="text-primary">Copied!</span>}
            {copyState === "error" && <span className="text-red-400">Failed to copy</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Copy size={12} />
              {copying ? "Copying…" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
