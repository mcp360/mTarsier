# mTarsier

[![mTarsier — MCP & Skills Management, without the chaos.](https://raw.githubusercontent.com/mcp360/mTarsier/main/src/assets/mtarsier-readme-banner.svg)](https://mcp360.ai/mtarsier)

[![GitHub Stars](https://img.shields.io/github/stars/mcp360/mTarsier?style=social)](https://github.com/mcp360/mTarsier)

**MCP & Skills Management, without the chaos.**


mTarsier is an open-source platform for managing MCP servers, Skills, and clients — so Claude, Cursor, VS Code and every AI tool you use always has the right MCP connections and Skills installed, without the chaos.

> Built in Rust 🦀. Lightweight. Fast.

---

## Features

### MCP Servers
- **Unified Dashboard** — all MCP servers across every client in one view
- **Client Detection** — auto-detects Claude Desktop, Cursor, Windsurf, VS Code, and more
- **Config Editor** — read/write config files with syntax highlighting and live JSON validation
- **Marketplace** — browse and install MCP servers into any client in a few clicks
- **Auto-backup** — backs up configs before every change with one-click rollback

### Skills
- **Skills Manager** — view, create, and manage skills across all supported clients
- **Skills Marketplace** — discover and install skills from marketplace registry
- **One-click Install** — install skills to one or multiple clients at once
- **Custom Skills** — create your own skills with the built-in editor or upload SKILL.md files
- **Copy & Share** — copy skills between clients with a single click
- **Featured Picks** — curated top skills like frontend-design, code-review, and more

### General
- **CLI Tool** — `tsr` command for terminal-based management of both MCP servers and Skills
- **Multi-theme** — dark biopunk, light, and system themes

---

## Supported Clients

| Client | Type | Config |
|---|---|---|
| Claude Desktop | Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| ChatGPT Desktop | Desktop | Web-managed |
| Codex | Desktop | `~/.codex/config.toml` |
| GitHub Copilot (VS Code) | IDE | `~/Library/Application Support/Code/User/mcp.json` |
| Cursor | IDE | `~/.cursor/mcp.json` |
| Windsurf | IDE | `~/.codeium/windsurf/mcp_config.json` |
| VS Code | IDE | `~/Library/Application Support/Code/User/mcp.json` |
| Antigravity | IDE | `~/.antigravity/mcp.json` |
| Claude Code | CLI | `~/.claude.json` |
| GitHub Copilot CLI | CLI | `~/.copilot/mcp-config.json` |
| Gemini CLI | CLI | `~/.gemini/settings.json` |
| Codex CLI | CLI | `~/.codex/config.toml` |
| Open Code | CLI | `~/.opencode/config.json` |
| Claude (web) | Web | Remote only |
| ChatGPT (web) | Web | Remote only |

---

## Installation

Grab the latest release from the [Releases](https://github.com/mcp360/mTarsier/releases/latest) page:

| Platform | File |
|---|---|
| macOS Apple Silicon | `mTarsier_*_aarch64.dmg` |
| macOS Intel | `mTarsier_*_x64.dmg` |
| Windows | `mTarsier_*_x64-setup.exe` |
| Linux | `mTarsier_*_amd64.AppImage` / `mTarsier_*_amd64.deb` |

### Homebrew (coming soon)

```bash
brew install mcp360/tap/tsr
```

---

## CLI — `tsr`

Install from the app: **Settings → CLI Tool → Install tsr CLI**

```bash
# MCP server management
$ tsr list
  filesystem      → Claude Desktop, Cursor, Windsurf
  brave-search    → Claude Desktop
  github          → Cursor, Windsurf

$ tsr clients
  ✓  claude-desktop   ~/Library/Application Support/Claude/...
  ✓  cursor           ~/.cursor/mcp.json
  ✓  windsurf         ~/.codeium/windsurf/mcp_config.json

$ tsr install brave-search   # install from marketplace
$ tsr config cursor --edit   # open config in $EDITOR
$ tsr ping <name>            # ping a server

# Skills management
$ tsr skills list --client claude-code
$ tsr skills search "frontend design"
$ tsr skills install anthropics/courses/prompt-eng --client claude-code
$ tsr skills remove skill-name --client claude-code
```

---

## 🤝 Community

Join our community to get help, share ideas, and stay updated:

- 💬 [Discord Community](https://discord.gg/Nq5vyrbm)
- 🐦 Follow us on X — [@0fficialRohit](https://x.com/0fficialRohit) · [@rege_dev](https://x.com/rege_dev)
- ⭐ [Star us on GitHub](https://github.com/mcp360/mTarsier)

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Maintainers:** [@0fficialRohit](https://x.com/0fficialRohit) · [@rege_dev](https://x.com/rege_dev)

---

## License

MIT — see [LICENSE](LICENSE)

---

## Conservation

Tarsier, one of the world's smallest and most endangered primates — [learn more](https://www.iucnredlist.org/search?query=tarsius).
