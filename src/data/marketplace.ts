export type McpCategory =
  | "Developer"
  | "Web"
  | "Data"
  | "Productivity"
  | "AI"
  | "Search"
  | "Automation";

export interface MarketplaceServer {
  id: string;
  name: string;
  description: string;
  publisher: string;
  category: McpCategory;
  command: string;
  args: string[];
  /** Direct SSE/Streamable-HTTP URL for clients that support native remote transport.
   *  Supports the same {param} substitution syntax as args. */
  remoteUrl?: string;
  apiKeys?: { key: string; label: string; hint?: string; required: boolean }[];
  params?: { key: string; label: string; placeholder: string; required: boolean; hint?: string; secret?: boolean }[];
  featured?: boolean;
  official?: boolean;
  docsUrl?: string;
}

export const CATEGORIES: McpCategory[] = [
  "Developer",
  "Web",
  "Data",
  "Productivity",
  "AI",
  "Search",
  "Automation",
];

export const MARKETPLACE_SERVERS: MarketplaceServer[] = [
  // ── Developer ──────────────────────────────────────────────────────────────
  {
    id: "filesystem",
    name: "Filesystem",
    description:
      "Read and write files on your local filesystem with configurable path-level access control.",
    publisher: "Anthropic",
    category: "Developer",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "{path}"],
    params: [
      {
        key: "path",
        label: "Directory Path",
        placeholder: "/Users/you/projects",
        required: true,
      },
    ],
    featured: true,
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Search repos, read files, manage issues and pull requests via the GitHub API.",
    publisher: "Anthropic",
    category: "Developer",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    apiKeys: [
      {
        key: "GITHUB_PERSONAL_ACCESS_TOKEN",
        label: "GitHub Personal Access Token",
        hint: "Create at github.com/settings/tokens",
        required: true,
      },
    ],
    featured: true,
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
  },
  {
    id: "mcp360",
    name: "MCP360",
    description:
      "Unified MCP gateway giving instant access to 100+ tools through a single API key — integrate once, access everything.",
    publisher: "MCP360",
    category: "AI",
    command: "npx",
    args: ["mcp-remote", "https://connect.mcp360.ai/v1/mcp360/mcp?token={MCP360_TOKEN}"],
    remoteUrl: "https://connect.mcp360.ai/v1/mcp360/mcp?token={MCP360_TOKEN}",
    params: [
      {
        key: "MCP360_TOKEN",
        label: "MCP360 API Key",
        placeholder: "mcp360_...",
        required: true,
        hint: "Generate at dashboard.mcp360.ai",
        secret: true,
      },
    ],
    featured: true,
    docsUrl: "https://mcp360.ai/docs",
  },
  {
    id: "git",
    name: "Git",
    description:
      "Read git repository history, diffs, and logs from local repos.",
    publisher: "Anthropic",
    category: "Developer",
    command: "uvx",
    args: ["mcp-server-git"],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
  },
  {
    id: "sentry",
    name: "Sentry",
    description:
      "Query Sentry issues, events, and performance data across your projects.",
    publisher: "Sentry",
    category: "Developer",
    command: "uvx",
    args: ["mcp-server-sentry"],
    apiKeys: [
      {
        key: "SENTRY_AUTH_TOKEN",
        label: "Sentry Auth Token",
        hint: "Generate at sentry.io → Settings → Auth Tokens",
        required: true,
      },
    ],
    docsUrl: "https://github.com/getsentry/sentry-mcp",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description:
      "Manage Workers, KV, R2, D1, and more on Cloudflare via browser OAuth.",
    publisher: "Cloudflare",
    category: "Developer",
    command: "npx",
    args: ["mcp-remote@latest", "https://modelcontextprotocol.cloudflare.com/sse"],
    docsUrl: "https://developers.cloudflare.com/mcp-server",
  },
  {
    id: "desktop-commander",
    name: "Desktop Commander",
    description:
      "Execute terminal commands, manage processes, and edit files on your desktop.",
    publisher: "wonderwhy-er",
    category: "Developer",
    command: "npx",
    args: ["-y", "@wonderwhy-er/desktop-commander@latest"],
    docsUrl: "https://github.com/wonderwhy-er/DesktopCommanderMCP",
  },

  // ── Web ────────────────────────────────────────────────────────────────────
  {
    id: "fetch",
    name: "Fetch",
    description:
      "Fetch web pages and convert them to Markdown for easy AI consumption and analysis.",
    publisher: "Anthropic",
    category: "Web",
    command: "uvx",
    args: ["mcp-server-fetch"],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description:
      "Control a headless Chrome browser for web scraping and UI automation.",
    publisher: "Anthropic",
    category: "Web",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
  },
  {
    id: "playwright",
    name: "Playwright",
    description:
      "Automate browsers for testing and scraping across Chrome, Firefox, and WebKit.",
    publisher: "Microsoft",
    category: "Web",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    featured: true,
    docsUrl: "https://github.com/microsoft/playwright-mcp",
  },

  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    id: "memory",
    name: "Memory",
    description:
      "Persistent knowledge graph memory with entity and relation tracking across conversations.",
    publisher: "Anthropic",
    category: "AI",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    featured: true,
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description:
      "Dynamic, reflective problem solving through structured, adaptive thought sequences.",
    publisher: "Anthropic",
    category: "AI",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
  },
  {
    id: "context7",
    name: "Context7",
    description:
      "Fetch up-to-date library documentation and code examples directly from the source.",
    publisher: "Upstash",
    category: "AI",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@latest"],
    docsUrl: "https://github.com/upstash/context7",
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  {
    id: "postgres",
    name: "PostgreSQL",
    description:
      "Query PostgreSQL databases with schema inspection and safe read-only SQL execution.",
    publisher: "Anthropic",
    category: "Data",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "{database_url}"],
    params: [
      {
        key: "database_url",
        label: "Database URL",
        placeholder: "postgresql://user:pass@localhost/mydb",
        required: true,
      },
    ],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
  },
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Manage Supabase projects, query databases, and invoke Edge Functions via MCP.",
    publisher: "Supabase",
    category: "Data",
    command: "npx",
    args: ["-y", "@supabase/mcp-server-supabase@latest"],
    apiKeys: [
      {
        key: "SUPABASE_ACCESS_TOKEN",
        label: "Supabase Access Token",
        hint: "Generate at app.supabase.com → Account → Access Tokens",
        required: true,
      },
    ],
    docsUrl: "https://github.com/supabase-community/supabase-mcp",
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  {
    id: "brave-search",
    name: "Brave Search",
    description:
      "Search the web with Brave's independent index — privacy-respecting, no filter bubbles.",
    publisher: "Anthropic",
    category: "Search",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    apiKeys: [
      {
        key: "BRAVE_API_KEY",
        label: "Brave Search API Key",
        hint: "Get your key at brave.com/search/api",
        required: true,
      },
    ],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
  },
  {
    id: "google-maps",
    name: "Google Maps",
    description:
      "Geocoding, directions, place search, and distance matrix via the Google Maps API.",
    publisher: "Google",
    category: "Search",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    apiKeys: [
      {
        key: "GOOGLE_MAPS_API_KEY",
        label: "Google Maps API Key",
        hint: "Create at console.cloud.google.com",
        required: true,
      },
    ],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps",
  },

  // ── Productivity ───────────────────────────────────────────────────────────
  {
    id: "slack",
    name: "Slack",
    description:
      "Read channels, post messages, and search Slack workspaces via the Slack API.",
    publisher: "Anthropic",
    category: "Productivity",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    apiKeys: [
      {
        key: "SLACK_BOT_TOKEN",
        label: "Slack Bot Token",
        hint: "From api.slack.com → Apps → OAuth & Permissions",
        required: true,
      },
      {
        key: "SLACK_TEAM_ID",
        label: "Slack Team ID",
        hint: "Found in your workspace URL (e.g. T01234ABC)",
        required: true,
      },
    ],
    official: true,
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Read pages, search databases, and retrieve blocks from your Notion workspace.",
    publisher: "Notion",
    category: "Productivity",
    command: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    apiKeys: [
      {
        key: "NOTION_API_KEY",
        label: "Notion API Key",
        hint: "Create an integration at notion.so/my-integrations",
        required: true,
      },
    ],
    docsUrl: "https://github.com/makenotion/notion-mcp-server",
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Query and update Linear issues, projects, and teams from your workspace.",
    publisher: "Linear",
    category: "Productivity",
    command: "npx",
    args: ["-y", "@linear/mcp-server"],
    apiKeys: [
      {
        key: "LINEAR_API_KEY",
        label: "Linear API Key",
        hint: "Generate at linear.app → Settings → API",
        required: true,
      },
    ],
    docsUrl: "https://github.com/linear/linear-mcp",
  },

  // ── Automation ─────────────────────────────────────────────────────────────
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Manage Stripe payments, customers, subscriptions, and webhook events programmatically.",
    publisher: "Stripe",
    category: "Automation",
    command: "npx",
    args: ["-y", "@stripe/mcp-server"],
    apiKeys: [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Stripe Secret Key",
        hint: "Find at dashboard.stripe.com → Developers → API Keys",
        required: true,
      },
    ],
    docsUrl: "https://github.com/stripe/agent-toolkit",
  },
];
