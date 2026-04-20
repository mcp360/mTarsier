# Skills

Skills are reusable instruction files (`SKILL.md`) that teach AI agents how to perform specific tasks. mTarsier lets you install, manage, and share skills across all supported clients.

## Installing Skills

### Via GUI

**From the Discover tab (skills.sh registry):**

1. Open **Skills** in the sidebar
2. Click the **Discover** tab
3. Search for a skill (e.g., "frontend design")
4. Click **Install** on the skill card
5. Select which clients to install to
6. Done — the skill is now available in those clients

**From GitHub (npx command):**

1. Open **Skills** in the sidebar
2. Select a client from the filter bar (e.g., Claude Code)
3. Click **Add Skill**
4. Go to the **npx Command** tab
5. Paste the install command or source:
   ```
   npx skills add obra/superpowers/brainstorming
   ```
6. Click **Install Skill**

**Create a custom skill manually:**

1. Open **Skills** > select a client > click **Add Skill**
2. Use the **Manual Entry** tab
3. Fill in the skill name, description, and SKILL.md instructions
4. Click **Create Skill**

**Upload a SKILL.md file:**

1. Open **Skills** > select a client > click **Add Skill**
2. Use the **Upload File** tab
3. Select a `.md` file with YAML frontmatter (`name`, `description`)
4. Fields are auto-filled — switch to Manual Entry to review and save

**Paste SKILL.md content:**

1. Open **Skills** > select a client > click **Add Skill**
2. Use the **Paste Content** tab
3. Paste the full SKILL.md content including frontmatter
4. Click **Parse & Import** — fields are auto-filled for review

### Via CLI (`tsr`)

Install the CLI first: **Settings > CLI Tool > Install tsr CLI**

**Search for skills:**

```bash
tsr skills search "frontend design"
```

**Install a skill from GitHub:**

```bash
# Install all skills from a repo
tsr skills install anthropics/courses --client claude-code

# Install a specific skill from a multi-skill repo
tsr skills install obra/superpowers/brainstorming --client claude-code --name brainstorming
```

**List installed skills:**

```bash
tsr skills list --client claude-code

# JSON output
tsr skills list --client claude-code --json
```

**Remove a skill:**

```bash
tsr skills remove skill-name --client claude-code
```

## Supported Clients

Skills are installed to each client's global skills directory:

| Client | Skills Path |
|--------|-------------|
| Claude Desktop | `~/Library/Application Support/Claude/skills` |
| Claude Code | `~/.claude/skills` |
| Codex | `~/.codex/skills` |
| Cursor | `~/.cursor/skills` |
| Windsurf | `~/.codeium/windsurf/skills` |
| GitHub Copilot | `~/.copilot/skills` |
| Antigravity | `~/.antigravity/skills` |
| Gemini CLI | `~/.gemini/skills` |

## Managing Skills

### View a skill

Click the eye icon on any skill card to see the full SKILL.md content in a read-only preview. You can copy the content from there.

### Copy to other clients

Click the copy icon on a skill card to copy it to other installed clients. Select the target clients and confirm.

### Delete a skill

Click the trash icon on a skill card. Confirm the deletion. If the skill is a symlink (installed via `npx skills add`), both the symlink and the original file are removed.

### Bulk delete

1. Click **Select** in the top-right of the Installed tab
2. Check the skills you want to remove
3. Click **Delete Selected**

### Open in Finder / Explorer

Click the folder icon on a skill card or click the path at the bottom of the card to open the skill directory in your file manager.

## SKILL.md Format

Every skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: "my-skill-name"
description: "What this skill does"
---

## Goal
Describe what this skill should accomplish.

## When To Use
List the situations where this skill should be applied.

## Steps
1. First step
2. Second step
3. Final step
```

The `name` and `description` fields in the frontmatter are required. The body contains the instructions the AI agent will follow.

## GitHub Source Format

When installing from GitHub, the source can be:

| Format | Example | What it does |
|--------|---------|-------------|
| `owner/repo` | `anthropics/courses` | Downloads the repo, finds all SKILL.md files, installs them |
| `owner/repo/skill-name` | `obra/superpowers/brainstorming` | Downloads the repo, installs only the named skill |
| Full URL | `https://github.com/anthropics/courses` | Same as `owner/repo` |
