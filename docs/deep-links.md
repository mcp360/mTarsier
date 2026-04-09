# Deep Links

mTarsier supports the `mtarsier://` URL protocol, enabling one-click installation of MCP servers and skills from any website, README, or terminal.

## Why Deep Links?

Without deep links, installing an MCP server requires users to manually edit JSON config files — copy the command, find the right config path, paste it in the correct format, and restart the client. Deep links remove all of that.

### For MCP server authors

Add an "Install with mTarsier" button to your README or docs page. Users click it, pick their clients, and the server is installed — no manual config editing.

```markdown
[Install with mTarsier](mtarsier://install/mcp/your-server-id)
```

### For skill creators

Link directly to your skill from your repo or blog. Users click, mTarsier opens the Skills page where they can install it with the existing flow.

```markdown
[Get this skill](mtarsier://install/skill?source=your-org/your-skill-repo)
```

### For teams and onboarding

Share a single link that sets up the right MCP servers for your team. New developers click the link instead of following a multi-step setup doc.

### For the mTarsier website

The [mtarsier.com](https://mtarsier.com) marketplace can link directly into the app — browse servers on the web, click install, and it just works.

## How It Works

```
User clicks link on a website
        |
  mtarsier:// URL
        |
   +-------------------+
   | mTarsier installed?|
   +------+------+-----+
     Yes  |      | No
          |      v
          |   "Download mTarsier" fallback
          |   (redirects to mtarsier.com)
          |
          v
  +-------------------------------+
  | What type of link?            |
  +-------+-------+-------+------+
          |       |       |
          v       v       v
  Marketplace   Skill /
  MCP server    Custom MCP /
  (exists in    Unknown server /
  registry)     Navigation
          |       |
          v       v
  Install     Opens the
  dialog      relevant
  (select     page only
  clients,
  one-click)
```

### Behavior Summary

| Link type | Condition | What happens |
|-----------|-----------|--------------|
| Marketplace MCP | Server ID exists in marketplace | Install dialog (select clients, one-click install) |
| Marketplace MCP | Server ID **not** found | Opens Marketplace page |
| Skill | Valid `owner/repo` format | Opens Skills page |
| Custom MCP | External `?name=...&command=...` | Opens Marketplace page |
| Navigation | `mtarsier://marketplace` etc. | Opens the page |
| Any link | mTarsier **not installed** | Fallback modal with "Download mTarsier" button (redirects to [mtarsier.com](https://mtarsier.com)) |

## URL Formats

### Install Marketplace MCP Server

Server ID must match a server in the built-in marketplace. If it does, mTarsier shows a direct install dialog. If not, it falls back to the Marketplace page.

```
mtarsier://install/mcp/<server-id>
```

**Examples:**

```
mtarsier://install/mcp/filesystem
mtarsier://install/mcp/github
mtarsier://install/mcp/brave-search
mtarsier://install/mcp/playwright
mtarsier://install/mcp/memory
```

### Install Custom MCP Server

Opens the Marketplace page. The user installs manually from there.

```
mtarsier://install/mcp?name=<id>&command=<cmd>&args=<comma-separated-args>
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Server identifier (alphanumeric, hyphens, underscores, dots) |
| `command` | Yes* | Command to run (e.g. `npx`, `uvx`, `node`) |
| `args` | No | Comma-separated arguments |
| `url` | Yes* | Remote MCP URL (for SSE/Streamable HTTP servers) |
| `env.<KEY>` | No | Environment variables (e.g. `env.API_KEY=xxx`) |

\* Either `command` or `url` is required.

**Examples:**

```
# stdio server
mtarsier://install/mcp?name=weather&command=npx&args=-y,mcp-weather-server

# with environment variable
mtarsier://install/mcp?name=my-api&command=npx&args=-y,mcp-my-api&env.API_KEY=sk-test123

# remote URL server
mtarsier://install/mcp?name=remote-tools&url=https://api.example.com/mcp
```

### Install Skill

Opens mTarsier on the Skills page. The source must be a valid GitHub `owner/repo` or `owner/repo/skill-name`.

```
mtarsier://install/skill?source=<owner/repo>
```

**Examples:**

```
mtarsier://install/skill?source=anthropics/courses
mtarsier://install/skill?source=obra/superpowers/brainstorming
```

### Navigate to a Page

Opens mTarsier on the specified page.

```
mtarsier://marketplace
mtarsier://skills
mtarsier://clients
mtarsier://config
mtarsier://settings
```

## Embedding on Your Website

Since `mtarsier://` links silently fail when the app isn't installed, your website should detect this and show a fallback.

### Recommended Pattern

```html
<button onclick="installWithMTarsier('mtarsier://install/mcp/filesystem')">
  Install with mTarsier
</button>

<script>
function installWithMTarsier(url) {
  // Try opening the deep link
  const a = document.createElement('a');
  a.href = url;
  a.click();

  // Detect if the app opened (page loses focus / goes hidden)
  let opened = false;
  const onHidden = () => { opened = true; };
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('blur', onHidden);

  // If still on the page after 1.5s, app is not installed
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('blur', onHidden);
    if (!opened) {
      window.location.href = 'https://mtarsier.com';
    }
  }, 1500);
}
</script>
```

## Testing from Terminal

**macOS:**

```bash
open "mtarsier://install/mcp/filesystem"
open "mtarsier://install/skill?source=anthropics/courses"
open "mtarsier://marketplace"
```

**Windows:**

```powershell
start mtarsier://install/mcp/filesystem
```

**Linux:**

```bash
xdg-open "mtarsier://install/mcp/filesystem"
```

> Note: The `mtarsier://` protocol is registered by the OS when mTarsier is installed (bundled `.app`/`.exe`/`.deb`). In dev mode (`pnpm tauri dev`), the protocol may not be registered unless manually done.

## Security

Deep link URLs are validated and sanitized before processing. The following protections are in place:

- All inputs (names, commands, URLs, arguments, env vars) are length-limited and character-restricted
- Remote URLs are validated to prevent SSRF against internal networks
- Object key injection (prototype pollution) is blocked
- Only the `mtarsier:` protocol is accepted
- Only marketplace servers that exist in the built-in registry get one-click install; unknown or custom servers only open the page
- Skill sources are validated against GitHub's `owner/repo` format
- Config backups are created automatically before any write

For implementation details, see `src/store/deepLinkStore.ts`.

## Architecture

| File | Role |
|------|------|
| `src-tauri/Cargo.toml` | `tauri-plugin-deep-link` dependency |
| `src-tauri/src/lib.rs` | Plugin registration, listens for `deep-link://new-url` events, emits `deep-link-received` to frontend, brings window to front |
| `src-tauri/tauri.conf.json` | `"deep-link": { "desktop": { "schemes": ["mtarsier"] } }` |
| `src-tauri/capabilities/default.json` | `"deep-link:default"` permission |
| `src/App.tsx` | `DeepLinkListener` component — reads initial URL on cold start via `getCurrent()`, listens for runtime events via `onOpenUrl()` and `listen("deep-link-received")` |
| `src/store/deepLinkStore.ts` | `parseDeepLink()` — URL parser with all security validation; `useDeepLinkStore` — Zustand store holding pending action |
| `src/components/deeplink/DeepLinkHandler.tsx` | Consumes pending action — shows install dialog for marketplace MCP, navigates to page for everything else |
