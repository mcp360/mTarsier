import { useState, useRef } from "react";
import { X, Upload, FileText, Edit3 } from "lucide-react";

interface Props {
  clientName: string;
  onClose: () => void;
  onCreate: (skillName: string, content: string) => Promise<void>;
}

type InputMode = "manual" | "upload" | "paste";

const DEFAULT_BODY = `## Goal
Describe what this skill should accomplish.

## When To Use
List the situations where this skill should be applied.

## Steps
1. First step
2. Second step
3. Final step
`;

function toYamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseSkillMd(content: string): { name: string; description: string; body: string } | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const [, frontmatterStr, body] = frontmatterMatch;
  const nameMatch = frontmatterStr.match(/name:\s*["']?([^"'\n]+)["']?/);
  const descMatch = frontmatterStr.match(/description:\s*["']?([^"'\n]+)["']?/);

  if (!nameMatch || !descMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
    body: body.trim(),
  };
}

export default function AddSkillDialog({ clientName, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<InputMode>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [pastedContent, setPastedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".md")) {
      setError("Please upload a .md file");
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseSkillMd(content);

      if (!parsed) {
        setError("Invalid SKILL.md format. Expected YAML frontmatter with name and description.");
        return;
      }

      setName(parsed.name);
      setDescription(parsed.description);
      setBody(parsed.body);
      setMode("manual");
      setError(null);
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
    }
  };

  const handlePasteContent = () => {
    const content = pastedContent.trim();
    if (!content) {
      setError("Please paste SKILL.md content");
      return;
    }

    const parsed = parseSkillMd(content);
    if (!parsed) {
      setError("Invalid SKILL.md format. Expected YAML frontmatter with name and description.");
      return;
    }

    setName(parsed.name);
    setDescription(parsed.description);
    setBody(parsed.body);
    setMode("manual");
    setPastedContent("");
    setError(null);
  };

  const handleCreate = async () => {
    const skillName = name.trim();
    const skillDescription = description.trim();
    const skillBody = body.trim();

    if (!skillName) {
      setError("Skill name is required");
      return;
    }
    if (!skillDescription) {
      setError("Description is required");
      return;
    }
    if (!skillBody) {
      setError("Skill instructions are required");
      return;
    }

    const content = `---
name: ${toYamlString(skillName)}
description: ${toYamlString(skillDescription)}
---

${skillBody}
`;

    setSaving(true);
    setError(null);
    try {
      await onCreate(skillName, content);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text">Add Skill</h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Create a new skill for <span className="text-text">{clientName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-text">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border px-5">
          <button
            onClick={() => setMode("manual")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
              mode === "manual"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Edit3 size={14} />
            Manual Entry
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
              mode === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Upload size={14} />
            Upload File
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
              mode === "paste"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <FileText size={14} />
            Paste Content
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mode === "manual" && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    Skill name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. release-notes-writer"
                    className="w-full rounded-lg border border-border bg-base px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    Description
                  </label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this skill helps the agent do"
                    className="w-full rounded-lg border border-border bg-base px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  SKILL.md instructions
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-border bg-base px-3 py-2 text-xs text-text focus:border-primary/40 focus:outline-none"
                />
              </div>
            </>
          )}

          {mode === "upload" && (
            <div className="space-y-3">
              <p className="text-[11px] text-text-muted">
                Upload a SKILL.md file with YAML frontmatter (name, description) and markdown instructions.
              </p>
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-base p-8 text-center">
                <Upload className="text-text-muted" size={32} />
                <div>
                  <p className="text-xs text-text">Choose a .md file to upload</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    The file will be parsed and fields auto-filled
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Select File
                </button>
              </div>
            </div>
          )}

          {mode === "paste" && (
            <div className="space-y-3">
              <p className="text-[11px] text-text-muted">
                Paste the complete SKILL.md content including YAML frontmatter.
              </p>
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder={`---\nname: "skill-name"\ndescription: "What this skill does"\n---\n\n## Goal\nDescribe the goal...\n\n## Steps\n1. First step\n2. Second step`}
                rows={14}
                className="w-full rounded-lg border border-border bg-base px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none font-mono"
              />
              <button
                onClick={handlePasteContent}
                disabled={!pastedContent.trim()}
                className="w-full rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Parse & Import
              </button>
            </div>
          )}

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        {mode === "manual" && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Skill"}
            </button>
          </div>
        )}

        {(mode === "upload" || mode === "paste") && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:text-text"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
