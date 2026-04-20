# Contributing to mTarsier

Thanks for your interest in contributing! mTarsier is open source and welcomes contributions of all kinds — bug fixes, new client support, marketplace additions, UI improvements, and docs.

## Before You Start

- **For small fixes** (typos, bug fixes, minor UI tweaks) — open a PR directly.
- **For larger changes** (new features, architectural changes, new clients) — open an issue first so we can align before you invest time.

## Setting Up Locally

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.77+ | [rustup.rs](https://rustup.rs) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 10.28+ | `npm install -g pnpm@10.28.2` (must match `packageManager` in package.json) |

#### Platform-specific dependencies

**macOS:**

```bash
xcode-select --install
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Linux (Fedora):**

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libxdo-devel libappindicator-gtk3-devel librsvg2-devel
```

**Windows:**

- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

For the full list, see [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

### Clone and Run

```bash
# Clone the repo
git clone https://github.com/mcp360/mTarsier.git
cd mTarsier

# Install frontend dependencies (pnpm version must match packageManager field)
pnpm install

# Build the tsr CLI sidecar binary (required before first run)
cd src-tauri && bash scripts/prepare-sidecar.sh && cd ..

# Start dev mode
pnpm tauri dev
```

The first run takes a few minutes to compile the Rust backend. Subsequent runs are fast (incremental compilation).

### What `prepare-sidecar.sh` does

The `tsr` CLI is a standalone Rust binary that ships alongside the app as a Tauri sidecar. The script:

1. Detects the host target triple (e.g., `aarch64-apple-darwin`)
2. Runs `cargo build --bin tsr`
3. Copies the binary to `src-tauri/binaries/tsr-<triple>` where Tauri expects it

Re-run it whenever you change Rust code in `src-tauri/src/bin/tsr.rs` or shared modules it uses.

### Production Build

```bash
# Build a release binary + bundled app (.dmg / .exe / .deb)
pnpm tauri build
```

The output will be in `src-tauri/target/release/bundle/`.

> Note: macOS builds require code signing for distribution. For local testing, unsigned builds work fine.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `cargo: command not found` | Install Rust via [rustup.rs](https://rustup.rs), then restart your terminal |
| `pnpm: command not found` | `npm install -g pnpm@10.28.2` |
| pnpm version mismatch error | The project pins `pnpm@10.28.2` in `package.json` — install that exact version |
| `error: failed to run custom build command for mtarsier` | Run `cd src-tauri && bash scripts/prepare-sidecar.sh` first |
| `webkit2gtk` not found (Linux) | Install the platform-specific dependencies listed above |
| Blank white window on launch | Check the dev console (Cmd+Opt+I / F12) for errors; usually a missing env or build step |
| `tsr` binary not found | Re-run `cd src-tauri && bash scripts/prepare-sidecar.sh` |

## Project Structure

```
src/                    # React frontend (TypeScript + Tailwind v4)
  pages/                # Full-page views (Dashboard, Clients, Config, Skills, Marketplace, etc.)
  components/           # UI components organized by feature
    marketplace/        # Marketplace install dialogs, cards
    config/             # Config editor, toolbar, backup panel
    skills/             # Skill cards, dialogs
    clients/            # Client detection, filtering
    settings/           # Theme picker, settings controls
  store/                # Zustand state stores (clientStore, configStore, skillStore, etc.)
  hooks/                # Custom React hooks
  lib/                  # Client registry, utilities, MCP utils
  types/                # TypeScript type definitions
  data/                 # Marketplace server definitions
  layouts/              # App layout (sidebar + content)
src-tauri/              # Rust backend
  src/
    commands/           # Tauri commands
      clients.rs        # Client detection, config reading
      config.rs         # Config writing, backups
      skills.rs         # Skills listing, install, delete
      audit.rs          # Audit logging
      cli.rs            # CLI installation
      io.rs             # Import/export
      server.rs         # mTarsier internal store
      utils.rs          # Path expansion, home dir
      updater.rs        # Auto-update
      tray.rs           # Menu bar tray icon
      flow.rs           # Flow import/export
    bin/tsr.rs          # CLI binary entry point
    lib.rs              # Tauri plugin registration, app setup
    marketplace.rs      # Marketplace registry (Rust side)
    registry.rs         # Client registry (Rust side)
    tray.rs             # Tray icon setup
  scripts/
    prepare-sidecar.sh  # Builds tsr CLI binary for Tauri sidecar
    make-dmg.sh         # macOS DMG packaging
  binaries/             # Compiled sidecar binaries (gitignored)
```

## Code Conventions

### Frontend (TypeScript / React)

- Use Tailwind CSS design tokens — never hardcode hex colors
- Keep components under 150 lines — extract if larger
- Wrap all `invoke()` calls in try/catch
- Use Zustand stores for shared state; local `useState` for component-only state

### Rust

- Never use `unwrap()` — use `?` or `map_err`
- All Tauri commands must return `Result<T, String>`
- New commands must be registered in both `commands/mod.rs` **and** `lib.rs`
- Handle `~` path expansion for macOS, Windows, and Linux

### Branch Naming

Branches must follow `<type>/<description>`:

- `feature/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation
- `refactor/` — code restructuring
- `chore/` — tooling, CI, deps
- `perf/` — performance
- `test/` — tests

## Adding a New MCP Client

1. Add an entry to `src/lib/clients.ts` → `CLIENT_REGISTRY`
2. Provide `configPath`, `configPathWin`, `configPathLinux`, `configKey`, `configFormat`, and `detection`
3. Verify detection works on at least macOS or Windows
4. Test config read/write in the Config page

## Adding a Marketplace Server

1. Add an entry to `src/data/marketplace.ts` → `MARKETPLACE_SERVERS`
2. Include `id`, `name`, `description`, `publisher`, `category`, `command`, `args`, and optionally `docsUrl`
3. If the server needs API keys, add `apiKeys` with `key`, `label`, `hint`, and `required`

## Pull Requests

- Keep PRs focused — one thing per PR
- Test your change manually before submitting
- Fill in the PR template

## Reporting Issues

- Bugs → use the [Bug Report](https://github.com/mcp360/mTarsier/issues/new) issue template
- New client requests → [Client Request](https://github.com/mcp360/mTarsier/issues/new?template=client-request.md)
- New server requests → [Server Request](https://github.com/mcp360/mTarsier/issues/new?template=server-request.md)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
