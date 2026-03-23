import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { CLIENT_REGISTRY } from "../lib/clients";
import type { ClientMeta } from "../types/client";

export interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  rawContent: string;
}

interface SkillStore {
  selectedClientId: string | null;
  skills: InstalledSkill[];
  isLoading: boolean;
  error: string | null;
  setSelectedClient: (id: string) => void;
  loadSkills: (clientId: string) => Promise<void>;
  writeSkill: (clientId: string, name: string, content: string) => Promise<void>;
  deleteSkill: (path: string, clientId: string) => Promise<void>;
}

function getSkillsPath(clientId: string): string | null {
  const client = CLIENT_REGISTRY.find((c) => c.id === clientId);
  return client?.skillsPath ?? null;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  selectedClientId: null,
  skills: [],
  isLoading: false,
  error: null,

  setSelectedClient: (id) => {
    set({ selectedClientId: id });
    get().loadSkills(id);
  },

  loadSkills: async (clientId) => {
    const skillsPath = getSkillsPath(clientId);
    if (!skillsPath) {
      set({ skills: [], error: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const skills = await invoke<InstalledSkill[]>("list_skills", { skillsPath });
      set({ skills, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false, skills: [] });
    }
  },

  writeSkill: async (clientId, name, content) => {
    const skillsPath = getSkillsPath(clientId);
    if (!skillsPath) return;
    await invoke<string>("write_skill", { skillsPath, skillName: name, content });
    await get().loadSkills(clientId);
  },

  deleteSkill: async (path, clientId) => {
    await invoke("delete_skill", { skillPath: path });
    await get().loadSkills(clientId);
  },
}));

export function getSkillableClients(): ClientMeta[] {
  return CLIENT_REGISTRY.filter((c) => c.supportsSkills && c.skillsPath);
}
