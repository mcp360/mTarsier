# MCP Server Installation

mTarsier lets you install and manage MCP (Model Context Protocol) servers across all your AI clients from one place.

## Installing MCP Servers

### Via GUI

**From the Marketplace:**

1. Open **Marketplace** in the sidebar
2. Browse or search for a server (e.g., "Filesystem", "GitHub", "Brave Search")
3. Click **Install** on the server card
4. If the server needs configuration (API keys, paths), fill them in on step 1
5. Select which clients to install to on step 2
6. Click **Install** — the server config is written to each selected client

**Add a custom server manually:**

1. Open **MCP** in the sidebar
2. Select a client from the left panel
3. Switch to **Edit** mode (top toolbar)
4. Add the server entry in JSON format
5. Click **Save**

### Via CLI (`tsr`)

Install the CLI first: **Settings > CLI Tool > Install tsr CLI**

**Install from marketplace:**

```bash
# Install a marketplace server
tsr install filesystem --client claude-desktop

# With parameters
tsr install filesystem --client claude-desktop --param path=/Users/you/projects
```

**Add a custom server:**

```bash
# stdio server
tsr add my-server --client claude-desktop --command npx --args -y mcp-my-server

# Remote URL server (SSE / Streamable HTTP)
tsr add my-remote --client claude-code --url https://api.example.com/mcp

# With environment variables
tsr add github --client cursor --command npx --args -y @modelcontextprotocol/server-github --env GITHUB_TOKEN=ghp_xxx

# With bearer token (HTTP servers)
tsr add my-api --client claude-code --url https://api.example.com/mcp --bearer-token sk-xxx

# Overwrite existing server
tsr add filesystem --client claude-desktop --command npx --args -y @modelcontextprotocol/server-filesystem /tmp --force
```

**List servers:**

```bash
# All servers across all clients
tsr list

# For a specific client
tsr list --client claude-desktop

# JSON output
tsr list --json
```

**Remove a server:**

```bash
tsr remove filesystem --client claude-desktop
```

**Disable / Enable a server (without removing):**

```bash
# Disable — removes from client config, saves to mTarsier store
tsr disable filesystem --client claude-desktop

# Enable — restores to client config from mTarsier store
tsr enable filesystem --client claude-desktop
```

**Ping a server:**

```bash
tsr ping filesystem
tsr ping filesystem --client claude-desktop
```

**View / edit config:**

```bash
# Show config file path
tsr config claude-desktop

# Print config contents
tsr config claude-desktop --show

# Open in $EDITOR
tsr config claude-desktop --edit
```

**List detected clients:**

```bash
tsr clients
tsr clients --json
```

## Managing MCP Servers via GUI

### Easy Manage mode

The default view when you select a client in the **MCP** page. Shows each server as a card with:

- Server name and config preview
- **Toggle** — enable/disable without deleting
- **Edit** — modify the server config inline
- **Delete** — remove the server entirely

### Edit mode

Switch to **Edit** in the toolbar to see the raw JSON/TOML config. Features:

- Syntax highlighting (Monaco editor)
- Live JSON validation
- Format button to auto-indent

### Backups

mTarsier creates a backup before every config change. To manage backups:

1. Click the **Backups** button in the toolbar
2. View all backups with timestamps
3. Click a backup to preview the diff (what would change)
4. Click **Restore** to roll back

## Supported Clients

| Client | Type | Config Format | Config Path (macOS) |
|--------|------|--------------|---------------------|
| Claude Desktop | Desktop | JSON | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Codex | Desktop | TOML | `~/.codex/config.toml` |
| Cursor | IDE | JSON | `~/.cursor/mcp.json` |
| Windsurf | IDE | JSON | `~/.codeium/windsurf/mcp_config.json` |
| VS Code | IDE | JSON | `~/Library/Application Support/Code/User/mcp.json` |
| GitHub Copilot (VS Code) | IDE | JSON | `~/Library/Application Support/Code/User/mcp.json` |
| Antigravity | IDE | JSON | `~/.antigravity/mcp.json` |
| Claude Code | CLI | JSON | `~/.claude.json` |
| GitHub Copilot CLI | CLI | JSON | `~/.copilot/mcp-config.json` |
| Gemini CLI | CLI | JSON | `~/.gemini/settings.json` |
| OpenCode | CLI | JSON | `~/.opencode/config.json` |
| Codex CLI | CLI | TOML | `~/.codex/config.toml` |

> Windows and Linux paths differ. See the full registry in `src/lib/clients.ts`.

## Server Config Format

MCP servers are defined as JSON entries with either a command (stdio) or URL (remote):

**stdio server:**

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/projects"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

**Remote server (SSE / Streamable HTTP):**

```json
{
  "my-remote": {
    "url": "https://api.example.com/mcp"
  }
}
```

## Import / Export

To transfer your entire MCP setup between machines or share it with teammates, see [Export & Import](export-import.md).
