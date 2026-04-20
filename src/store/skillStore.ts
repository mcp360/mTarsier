import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ClientMeta } from "../types/client";

export interface InstalledSkill {
  name: string;
  description: string;
  version?: string;
  path: string;
  raw_content: string;
}

interface SkillStore {
  selectedClientId: string | null;
  skills: InstalledSkill[];
  isLoading: boolean;
  error: string | null;
  setSelectedClient: (id: string) => void;
  loadSkills: (skillsPath: string | undefined, forceRefresh?: boolean) => Promise<void>;
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

  loadSkills: async (skillsPath, forceRefresh = false) => {
    if (!skillsPath) {
      set({ skills: [], error: null, isLoading: false });
      return;
    }
    // Only show loading spinner if we don't have skills already (prevents flicker on tab switch)
    // But always fetch fresh data
    const hasExistingSkills = get().skills.length > 0;
    if (!hasExistingSkills || forceRefresh) {
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

const FAVORITES_KEY = "mtarsier-skill-favorites";

interface FavoritesStore {
  favorites: Set<string>;
  toggle: (path: string) => void;
  isFavorite: (path: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => {
  const stored = localStorage.getItem(FAVORITES_KEY);
  const initial: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set();
  return {
    favorites: initial,
    toggle: (path) => {
      const next = new Set(get().favorites);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      set({ favorites: next });
    },
    isFavorite: (path) => get().favorites.has(path),
  };
});

export function getSkillableClients(detectedClients: ClientMeta[]): ClientMeta[] {
  const seen = new Set<string>();
  return detectedClients.filter((c) => {
    if (!c.supportsSkills || !c.skillsPath) return false;
    if (seen.has(c.skillsPath)) return false;
    seen.add(c.skillsPath);
    return true;
  });
}
