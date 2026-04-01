import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AgentSkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  path: string;
  frontmatter: {
    name: string;
    description: string;
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowedTools?: string[];
  };
  content: string;
  files?: {
    scripts?: string[];
    references?: string[];
    assets?: string[];
  };
  source?: "local" | "skills.sh" | "github" | "custom";
  lastUpdated?: string;
}

interface SkillsStore {
  skills: AgentSkill[];
  addSkill: (skill: AgentSkill) => void;
  updateSkill: (id: string, skill: AgentSkill) => void;
  deleteSkill: (id: string) => void;
  toggleSkill: (id: string) => void;
  setSkills: (skills: AgentSkill[]) => void;
}

// Initial demo skills
const initialSkills: AgentSkill[] = [
  {
    id: "expense-report",
    name: "expense-report",
    description: "File and validate employee expense reports according to company policy. Use when asked about expense submissions, reimbursement rules, or spending limits.",
    enabled: true,
    path: "~/.skills/expense-report",
    frontmatter: {
      name: "expense-report",
      description: "File and validate employee expense reports according to company policy. Use when asked about expense submissions, reimbursement rules, or spending limits.",
      license: "Apache-2.0",
      compatibility: "Requires python3",
      metadata: {
        author: "contoso-finance",
        version: "2.1"
      }
    },
    content: "# Expense Report Filing\n\n## Overview\nThis skill handles employee expense report submissions...",
    files: {
      scripts: ["validate.py", "submit.sh"],
      references: ["POLICY_FAQ.md"],
      assets: ["template.md"]
    },
    source: "skills.sh",
    lastUpdated: new Date().toISOString()
  },
  {
    id: "code-review",
    name: "code-review",
    description: "Perform comprehensive code reviews with security analysis, performance checks, and best practices validation. Use for reviewing pull requests or code changes.",
    enabled: true,
    path: "~/.skills/code-review",
    frontmatter: {
      name: "code-review",
      description: "Perform comprehensive code reviews with security analysis, performance checks, and best practices validation. Use for reviewing pull requests or code changes.",
      license: "MIT",
      metadata: {
        author: "vercel-labs",
        version: "1.0.3"
      }
    },
    content: "# Code Review Process\n\n## Steps\n1. Check code quality...",
    source: "github",
    lastUpdated: new Date().toISOString()
  }
];

export const useSkillsStore = create<SkillsStore>()(
  persist(
    (set) => ({
      skills: initialSkills,

      addSkill: (skill) =>
        set((state) => ({
          skills: [...state.skills, skill],
        })),

      updateSkill: (id, skill) =>
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? skill : s)),
        })),

      deleteSkill: (id) =>
        set((state) => ({
          skills: state.skills.filter((s) => s.id !== id),
        })),

      toggleSkill: (id) =>
        set((state) => ({
          skills: state.skills.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        })),

      setSkills: (skills) => set({ skills }),
    }),
    {
      name: "skills-storage", // localStorage key
    }
  )
);