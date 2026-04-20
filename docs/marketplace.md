# Marketplace

The Marketplace is mTarsier's built-in catalog for discovering and installing MCP servers and skills. It provides a visual interface for browsing, searching, and one-click installation across all your AI clients.

## MCP Servers

### Browsing

Open **Marketplace** in the sidebar. The MCP tab is the default view.

- **Featured servers** are shown at the top in a horizontal carousel (e.g., Playwright, MCP360, Excalidraw, Memory)
- Below that, all servers are listed as cards grouped by category
- Each card shows the server name, publisher, description, and install status

### Categories

Filter servers by category using the category bar:

| Category | Examples |
|----------|----------|
| All | Everything |
| Developer | Filesystem, GitHub, Git, Figma, Excalidraw, Desktop Commander, Cloudflare, JFrog, Snyk |
| Web | Fetch, Puppeteer, Playwright |
| Data | PostgreSQL, Supabase, Redis, Slack, Gmail |
| Productivity | Qdrant |
| AI | MCP360, Memory, Sequential Thinking, Context7, LLM Prompt Tracker |
| Search | Brave Search, Google Maps, Keyword Research |

### Searching

Type in the search bar at the top to filter servers by name, description, or publisher. Search works alongside category filters — you can search within a specific category.

### Installing a server

1. Click **Install** on a server card
2. **Step 1 (Configure)** — if the server needs API keys or parameters (e.g., directory path, API token), fill them in. Hints link to where you can get the keys.
3. **Step 2 (Select Clients)** — check which clients to install to. Clients that already have the server show an "installed" badge.
4. Click **Install** — the server config is written to each selected client's config file. A backup is created automatically.

### Uninstalling a server

1. Click **Install** on a server that's already installed (the button shows the install status)
2. Switch to the **Remove** tab in the dialog
3. Select which clients to remove from
4. Click **Remove**

### Bulk install

1. Click **Select** in the top-right corner to enter selection mode
2. Check multiple server cards
3. Click **Install Selected**
4. Choose target clients and confirm

### Video demos

Some servers have tutorial videos. Click the play button on the server card to watch installation guides and usage demos in a modal player.

### Remote URL servers

Some servers support remote connections (SSE / Streamable HTTP) in addition to stdio. For clients that support native remote transport (like Claude Code), mTarsier automatically uses the remote URL instead of spawning a local process.

Web-only clients (Claude Web, ChatGPT Web) that don't have a local config file will show a guide with the remote URL to paste manually.

## Skills

### Discover tab

Switch to the **Skills** tab in the Marketplace to search the [skills.sh](https://skills.sh) registry.

1. Type a search query (e.g., "frontend design", "code review")
2. Results show skill name, description, publisher, and install count
3. Click **Install** on a skill card
4. Select which clients to install to
5. Click **Install** — the skill is downloaded from GitHub and installed

### Featured skills

The Marketplace also shows a curated list of **Featured Picks** — popular skills recommended for common use cases. These appear below the search results.

## CLI

The CLI (`tsr`) supports marketplace installation for MCP servers:

```bash
# Install a marketplace server by name
tsr install filesystem --client claude-desktop

# With parameters
tsr install filesystem --client claude-desktop --param path=/Users/you/projects
```

For skills, use the skills subcommand:

```bash
# Search the registry
tsr skills search "frontend design"

# Install from GitHub
tsr skills install anthropics/courses --client claude-code
```

## Available Servers

mTarsier ships with 40+ pre-configured servers. Some highlights:

| Server | Publisher | Category | Notes |
|--------|-----------|----------|-------|
| Filesystem | Anthropic | Developer | Configurable path access |
| GitHub | Anthropic | Developer | Requires personal access token |
| Playwright | Microsoft | Web | Browser automation (featured) |
| MCP360 | MCP360 | AI | 100+ unified tools gateway (featured) |
| Memory | Anthropic | AI | Persistent knowledge graph (featured) |
| Excalidraw | Excalidraw | Developer | Whiteboard diagrams (featured) |
| Brave Search | Brave | Search | Requires API key |
| PostgreSQL | Anthropic | Data | Database access with schema inspection |
| Figma | Figma | Developer | Requires personal access token |
| Sentry | Sentry | Developer | Requires auth token |
| Context7 | Upstash | AI | Live library documentation |
| Cloudflare | Cloudflare | Developer | Workers, KV, R2, D1 via OAuth |
| Desktop Commander | wonderwhy-er | Developer | Terminal commands and file editing |
| Puppeteer | Anthropic | Web | Headless Chrome browser |

For the full list, see the MCP tab in the Marketplace or `src/data/marketplace.ts`.
