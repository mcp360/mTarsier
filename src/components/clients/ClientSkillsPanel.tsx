import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ClientSkillEntry {
  name: string;
  description: string;
  path: string;
}

interface Props {
  clientId: string;
  supportsSkills?: boolean;
  skillsPath?: string;
}

export default function ClientSkillsPanel({ clientId, supportsSkills, skillsPath }: Props) {
  const [skills, setSkills] = useState<ClientSkillEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!supportsSkills || !skillsPath) {
      setSkills([]);
      setLoading(false);
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await invoke<ClientSkillEntry[]>("list_skills", { skillsPath });
        if (!cancelled) {
          setSkills(list);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setSkills([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [clientId, supportsSkills, skillsPath]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-text">Skills</h4>
        {supportsSkills && skillsPath && !loading && !error && (
          <span className="text-[10px] text-text-muted/70">
            {skills.length} installed
          </span>
        )}
      </div>

      {!supportsSkills || !skillsPath ? (
        <p className="text-xs text-text-muted">This client does not support skills.</p>
      ) : (
        <>
          <p className="mb-2 truncate font-mono text-[10px] text-text-muted/60">
            {skillsPath}
          </p>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-7 rounded-md border border-border bg-base-lighter animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-red-400">Failed to load skills</p>
          ) : skills.length === 0 ? (
            <p className="text-xs text-text-muted">No skills installed for this client.</p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {skills.map((skill) => (
                <div
                  key={skill.path}
                  className="rounded-md border border-border bg-base-light px-2.5 py-1.5"
                >
                  <p className="truncate text-xs font-medium text-text">{skill.name}</p>
                  {skill.description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted/70">
                      {skill.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
