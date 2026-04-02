import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ClientMeta } from "../types/client";

export interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  raw_content: string;
}

interface SkillStore {
  selectedClientId: string | null;
  skills: InstalledSkill[];
  isLoading: boolean;
  error: string | null;
  setSelectedClient: (id: string) => void;
  loadSkills: (skillsPath: string | undefined) => Promise<void>;
  writeSkill: (skillsPath: string, name: string, content: string) => Promise<void>;
  deleteSkill: (path: string, skillsPath: string | undefined) => Promise<void>;
  deleteSkills: (paths: string[], skillsPath: string | undefined) => Promise<void>;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  selectedClientId: null,
  skills: [],
  isLoading: false,
  error: null,

  setSelectedClient: (id) => {
    set({ selectedClientId: id });
  },

  loadSkills: async (skillsPath) => {
    if (!skillsPath) {
      set({ skills: [], error: null, isLoading: false });
      return;
    }
    // Only show loading if we don't have skills already (prevents flicker on tab switch)
    const hasExistingSkills = get().skills.length > 0;
    if (!hasExistingSkills) {
      set({ isLoading: true, error: null });
    }
    try {
      const skills = await invoke<InstalledSkill[]>("list_skills", { skillsPath });
      set({ skills, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false, skills: [] });
    }
  },

  writeSkill: async (skillsPath, name, content) => {
    if (!skillsPath) return;
    await invoke<string>("write_skill", { skillsPath, skillName: name, content });
    await get().loadSkills(skillsPath);
  },

  deleteSkill: async (path, skillsPath) => {
    await invoke("delete_skill", { skillPath: path });
    await get().loadSkills(skillsPath);
  },

  deleteSkills: async (paths, skillsPath) => {
    if (paths.length === 0) return;
    await invoke<number>("delete_skills_bulk", { skillPaths: paths });
    await get().loadSkills(skillsPath);
  },
}));

export function getSkillableClients(detectedClients: ClientMeta[]): ClientMeta[] {
  return detectedClients.filter((c) => c.supportsSkills && c.skillsPath);
}
