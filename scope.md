# MCP Tarsier — Claude Code Project Prompt

> Open-source desktop app for managing MCP servers, clients, and marketplace.  
> Built with **Tauri v2 + React + TypeScript**.  
> CLI command: `tsr`

---

## What is MCP Tarsier?

MCP Tarsier is an open-source desktop application that makes adopting the **Model Context Protocol (MCP)** easy for developers. Named after the Tarsier — a primate with 180° vision that sees everything around it — this app gives developers full visibility and control over their entire MCP ecosystem from one place.

It is the official desktop companion to **MCP360** (connect.mcp360.ai), a unified MCP gateway by Delta4 Infotech.

### Core Purpose
- Manage MCP server connections across all supported clients
- Edit config files for every MCP-compatible client (Claude Desktop, Cursor, VS Code, etc.)
- Browse and install MCPs from the MCP360 Marketplace
- Make MCP adoption easy for developers at every skill level

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| State management | Zustand |
| Build tool | Vite |
| Backend (native) | Rust (Tauri commands) |
| CLI | `tsr` (Rust binary, ships with app) |
| Package manager | pnpm |
| CI/CD | GitHub Actions |

---

## Design Language

- **Theme**: Biopunk night-vision terminal — dark forest black `#080c0a` base
- **Primary accent**: Bioluminescent green `#00ff88`
- **Secondary**: Cyan `#00d4ff`, Amber `#ffb800`
- **Fonts**: `Bricolage Grotesque` (UI) + `Geist Mono` (data/code/paths)
- **Logo**: Tarsier eye — concentric rings with glowing iris, represents 180° full visibility
- **Motif**: Everything the Tarsier sees, you see — complete MCP visibility

---

## Project Structure

```
mcp-tarsier/
├── src/                        # React frontend
│   ├── components/             # Shared UI components
│   ├── pages/                  # Tab pages
│   │   ├── Dashboard.tsx       # Server overview
│   │   ├── Clients.tsx         # MCP clients list
│   │   ├── Config.tsx          # Config editor
│   │   ├── Marketplace.tsx     # MCP marketplace
│   │   ├── Settings.tsx        # App settings
│   │   └── About.tsx           # About screen
│   ├── store/                  # Zustand state stores
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── lib/                    # Utilities
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/           # Tauri commands (fs, ping, detect)
│   │   │   ├── config.rs       # Read/write config files
│   │   │   ├── clients.rs      # Detect installed clients
│   │   │   └── server.rs       # Ping/health check servers
│   │   └── cli/                # tsr CLI logic
│   └── tauri.conf.json
├── public/
│   └── tarsier-eye.svg         # App icon
└── package.json
```

---

## Module Breakdown

Work through these modules **one at a time**. Complete and test each before moving to the next.

---

### Module 1 — Project Scaffold

**Goal**: Working Tauri v2 + React + TypeScript app that opens a window.

Tasks:
- Init Tauri v2 project with `create-tauri-app`
- Configure `tauri.conf.json`:
  - App name: `MCP Tarsier`
  - Identifier: `ai.mcp360.tarsier`
  - Window: `1200x800`, min `900x600`, `decorations: true`
  - Title bar: `MCP Tarsier`
- Install frontend deps: React 18, TypeScript, Vite, Tailwind CSS, Zustand, react-router-dom
- Set up Tailwind with custom design tokens (colors, fonts from design language above)
- Import fonts: `Bricolage Grotesque` + `Geist Mono` from Google Fonts
- Create basic layout shell: sidebar + main content area
- Verify app builds and runs on macOS, Windows, Linux

**Done when**: `pnpm tauri dev` opens a window with sidebar layout.

---

### Module 2 — Sidebar & Navigation

**Goal**: Working sidebar with navigation between all tabs.

Components to build:
- `Sidebar.tsx` — logo, nav items, system status strip at bottom
- `TarsierEyeLogo.tsx` — SVG eye logo with CSS glow animation
- `NavItem.tsx` — active state with left accent bar + glow
- `SystemStatus.tsx` — server count, client count, live clock

Nav items:
- Overview (Dashboard)
- Clients
- Config
- Marketplace
- Settings

**Done when**: All tabs are clickable and render placeholder content.

---

### Module 3 — Dashboard (Server Overview)

**Goal**: Display connected MCP servers with live status.

Features:
- Stat cards: Servers Online, API Calls/24h, Active Clients, Installed MCPs
- Server table with columns: Name, Endpoint, Status, Latency, Calls, Uptime, Clients
- `StatusOrb` component — pulsing ring animation per status (online/offline/warning/connecting)
- `LatencyBar` component — inline bar + ms value, color-coded green/amber/red
- Add Server modal — Name, Endpoint URL, Transport (HTTP/SSE, stdio, WebSocket)
- Ping button per server — calls Rust `ping_server` command
- On add: status shows `connecting` → transitions to `online` after ping succeeds

Tauri Rust commands needed:
```rust
#[tauri::command]
async fn ping_server(url: String) -> Result<u64, String>  // returns latency ms
```

**Done when**: Servers display with live ping, add server modal works.

---

### Module 4 — Clients

**Goal**: List all 26 supported MCP clients grouped by type, detect which are installed locally.

Supported clients (from mcp360.ai/clients):
```
Desktop: Claude Desktop, 5ire, BoltAI, Chatbox
IDE: Cursor, Windsurf, Claude Code, VS Code Copilot, Cline, Zed, Amazon Q IDE, JetBrains AI, Continue, Amp, Augment Code
Web: Claude.ai, ChatGPT, YourGPT, n8n, Flowise, Postman, Glama
CLI: Amazon Q CLI, Goose
Framework: AgentAI, Genkit
```

Each client record:
```typescript
type Client = {
  id: string
  name: string
  type: 'Desktop' | 'IDE' | 'Web' | 'CLI' | 'Framework'
  icon: string
  configPath: string | null        // macOS path
  configPathWin: string | null     // Windows path
  configPathLinux: string | null   // Linux path
  docsUrl: string
  installed: boolean               // detected by Rust
}
```

Features:
- Filter by type (Desktop, IDE, Web, CLI, Framework, All)
- Color-coded type badges
- Installed badge with pulsing green orb
- "Edit Config" button → navigates to Config tab with client pre-selected
- "Detect" button → calls Rust command to check if client is installed
- Web/Framework clients show "Remote · No local config"

Tauri Rust commands needed:
```rust
#[tauri::command]
fn detect_installed_clients() -> Vec<String>  // returns list of installed client ids

#[tauri::command]  
fn get_client_config_path(client_id: String) -> Option<String>  // OS-aware path resolution
```

**Done when**: All clients display, installed ones are auto-detected on app launch.

---

### Module 5 — Config Editor

**Goal**: Read and write MCP config files for each local client.

Features:
- Left panel: list of all clients with local config files
  - Shows `cfg` badge if config exists on disk
  - Active selection highlighted with accent border
- Right panel: Monaco-style code editor (use `@monaco-editor/react`)
  - JSON syntax highlighting
  - Error highlighting on invalid JSON
  - Line numbers
- Topbar per client: name, type badge, file path (macOS + Windows), installed status
- Action buttons: Save, Format JSON, Validate, Export, Import, Reset
- Error bar: red left-border alert on JSON parse errors
- Tip: "Changes apply after restarting the client"

Tauri Rust commands needed:
```rust
#[tauri::command]
fn read_config(path: String) -> Result<String, String>

#[tauri::command]
fn write_config(path: String, content: String) -> Result<(), String>

#[tauri::command]
fn watch_config(path: String) -> Result<(), String>  // file watcher for external changes
```

Path resolution must handle:
- `~` expansion on macOS/Linux
- `%APPDATA%` expansion on Windows
- Create file if it doesn't exist

**Done when**: Can read, edit, and save real config files on disk for Claude Desktop and Cursor.

---

### Module 6 — Marketplace

**Goal**: Browse and install MCPs from MCP360 marketplace.

Features:
- Search bar + category filter pills
- Stats bar: Total, Installed, New, Verified counts
- MCP cards grid:
  - Icon, name, verified checkmark, NEW badge
  - Category badge
  - Description
  - Download count + star rating
  - Install / Installed button
- Install flow:
  1. Select which clients to install into (multi-select modal)
  2. Writes MCP entry to selected client config files
  3. Shows success toast

API integration:
- Fetch from `https://api.mcp360.ai/v1/marketplace` (or mock data if API not ready)
- Cache results in Zustand store
- Fallback to bundled static JSON if offline

**Done when**: Can browse MCPs and install one into Claude Desktop config.

---

### Module 7 — Settings

**Goal**: App-level preferences.

Settings to include:
- **Theme**: Dark (default) / Light / System
- **Update channel**: Stable / Beta
- **Telemetry**: Anonymous usage stats opt-in (default off)
- **Auto-detect clients**: Toggle (default on, runs on startup)
- **MCP360 API URL**: Editable (default `https://api.mcp360.ai`)
- **MCP360 Account**: Sign in / Sign out (OAuth)

Persist settings with Tauri's `store` plugin (JSON file on disk).

**Done when**: Theme toggle works, settings persist across restarts.

---

### Module 8 — About Screen

**Goal**: Brand identity + legal + conservation note.

Include:
- Tarsier Eye logo (large, animated)
- App name: MCP Tarsier
- Version number (read from `tauri.conf.json`)
- Tagline: *"Full visibility for your MCP ecosystem"*
- Built by: Delta4 Infotech, Mohali, India 🇮🇳
- Powered by: MCP360 (link to mcp360.ai)
- License: MIT
- GitHub link
- **Conservation note**: *"Named after the Tarsier, one of the world's smallest primates. Tarsiers are endangered — we support conservation efforts."* + link
- Third-party licenses button

**Done when**: About screen renders with all info, links open in browser.

---

### Module 9 — CLI (`tsr`)

**Goal**: Basic CLI that mirrors key app features for terminal users.

Commands:
```bash
tsr list                          # list all connected servers
tsr add <name> <url>              # add a new server
tsr ping <name>                   # ping a server
tsr clients                       # list detected clients
tsr config <client-id>            # print config path for a client
tsr config <client-id> --edit     # open config in $EDITOR
tsr install <mcp-name>            # install MCP from marketplace
tsr --version                     # print version
tsr --help                        # help
```

Build as a Rust binary using `clap` crate. Ships alongside the desktop app.

**Done when**: `tsr list` and `tsr ping` work from terminal.

---

### Module 10 — Build & Distribution

**Goal**: Automated cross-platform builds and releases.

GitHub Actions workflow:
- Trigger on `git tag v*`
- Build matrix: macOS (arm64 + x86_64), Windows (x86_64), Linux (x86_64)
- Outputs: `.dmg`, `.msi`, `.AppImage`, `.deb`
- Upload to GitHub Releases
- Generate SHA256 checksums

Auto-updater:
- Use Tauri's built-in updater plugin
- Check for updates on launch (respects update channel from Settings)
- Show update banner in sidebar when update available

Homebrew:
- Create `homebrew-tap` repo
- Formula: `brew install mcp360/tap/tsr`

**Done when**: GitHub Action runs and produces installers for all platforms.

---

## Global Rules for Claude Code

1. **One module at a time** — complete, build, and test before starting the next
2. **TypeScript strict mode** — no `any` types
3. **Error handling** — every Tauri command call must have try/catch with user-visible error
4. **OS awareness** — all file paths must handle macOS, Windows, and Linux
5. **Offline first** — app must work without internet (except Marketplace fetch)
6. **No hardcoded paths** — use Tauri's path API (`appDataDir`, `homeDir`, etc.)
7. **Rust safety** — no `unwrap()` in production Rust code, use `?` operator
8. **Component size** — keep React components under 150 lines, extract if larger
9. **Commit per module** — one clean commit when each module is complete

---

## Key Links

- MCP360: https://mcp360.ai
- MCP360 Clients: https://mcp360.ai/clients
- Tauri v2 docs: https://v2.tauri.app
- MCP spec: https://modelcontextprotocol.io
- GitHub org: https://github.com/mcp360

---

## Start Command

```
Begin with Module 1. Scaffold the Tauri v2 + React + TypeScript project.
Do not proceed to Module 2 until the app window opens successfully with pnpm tauri dev.
```