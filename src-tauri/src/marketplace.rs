pub struct MarketplaceDef {
    pub id: &'static str,
    pub name: &'static str,
    pub command: &'static str,
    pub args: &'static [&'static str],
    pub env_keys: &'static [&'static str],
    pub arg_params: &'static [&'static str],
}

pub static MARKETPLACE: &[MarketplaceDef] = &[
    // ── Developer ──────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "filesystem",
        name: "Filesystem",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-filesystem", "{path}"],
        env_keys: &[],
        arg_params: &["path"],
    },
    MarketplaceDef {
        id: "github",
        name: "GitHub",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-github"],
        env_keys: &["GITHUB_PERSONAL_ACCESS_TOKEN"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "mcp360",
        name: "MCP360",
        command: "npx",
        args: &[
            "mcp-remote",
            "https://connect.mcp360.ai/v1/mcp360/mcp?token={MCP360_TOKEN}",
        ],
        env_keys: &[],
        arg_params: &["MCP360_TOKEN"],
    },
    MarketplaceDef {
        id: "git",
        name: "Git",
        command: "uvx",
        args: &["mcp-server-git"],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "sentry",
        name: "Sentry",
        command: "uvx",
        args: &["mcp-server-sentry"],
        env_keys: &["SENTRY_AUTH_TOKEN"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "cloudflare",
        name: "Cloudflare",
        command: "npx",
        args: &[
            "mcp-remote@latest",
            "https://modelcontextprotocol.cloudflare.com/sse",
        ],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "desktop-commander",
        name: "Desktop Commander",
        command: "npx",
        args: &["-y", "@wonderwhy-er/desktop-commander@latest"],
        env_keys: &[],
        arg_params: &[],
    },
    // ── Web ────────────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "fetch",
        name: "Fetch",
        command: "uvx",
        args: &["mcp-server-fetch"],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "puppeteer",
        name: "Puppeteer",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-puppeteer"],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "playwright",
        name: "Playwright",
        command: "npx",
        args: &["-y", "@playwright/mcp@latest"],
        env_keys: &[],
        arg_params: &[],
    },
    // ── AI ─────────────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "llm-prompt-tracker",
        name: "LLM Prompt Tracker",
        command: "npx",
        args: &[
            "mcp-remote",
            "https://connect.mcp360.ai/v1/llm-prompt-tracker/mcp?token={MCP360_TOKEN}",
        ],
        env_keys: &[],
        arg_params: &["MCP360_TOKEN"],
    },
    MarketplaceDef {
        id: "memory",
        name: "Memory",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-memory"],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "sequential-thinking",
        name: "Sequential Thinking",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-sequential-thinking"],
        env_keys: &[],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "context7",
        name: "Context7",
        command: "npx",
        args: &["-y", "@upstash/context7-mcp@latest"],
        env_keys: &[],
        arg_params: &[],
    },
    // ── Data ───────────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "postgres",
        name: "PostgreSQL",
        command: "npx",
        args: &[
            "-y",
            "@modelcontextprotocol/server-postgres",
            "{database_url}",
        ],
        env_keys: &[],
        arg_params: &["database_url"],
    },
    MarketplaceDef {
        id: "supabase",
        name: "Supabase",
        command: "npx",
        args: &["-y", "@supabase/mcp-server-supabase@latest"],
        env_keys: &["SUPABASE_ACCESS_TOKEN"],
        arg_params: &[],
    },
    // ── Search ─────────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "brave-search",
        name: "Brave Search",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-brave-search"],
        env_keys: &["BRAVE_API_KEY"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "google-maps",
        name: "Google Maps",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-google-maps"],
        env_keys: &["GOOGLE_MAPS_API_KEY"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "onpage-seo",
        name: "OnPage SEO Checker",
        command: "npx",
        args: &[
            "mcp-remote",
            "https://connect.mcp360.ai/v1/onpage-seo/mcp?token={MCP360_TOKEN}",
        ],
        env_keys: &[],
        arg_params: &["MCP360_TOKEN"],
    },
    MarketplaceDef {
        id: "keyword-research",
        name: "Keyword Research Tools",
        command: "npx",
        args: &[
            "mcp-remote",
            "https://connect.mcp360.ai/v1/keyword-research/mcp?token={MCP360_TOKEN}",
        ],
        env_keys: &[],
        arg_params: &["MCP360_TOKEN"],
    },
    // ── Productivity ───────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "slack",
        name: "Slack",
        command: "npx",
        args: &["-y", "@modelcontextprotocol/server-slack"],
        env_keys: &["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "notion",
        name: "Notion",
        command: "npx",
        args: &["-y", "@notionhq/notion-mcp-server"],
        env_keys: &["NOTION_API_KEY"],
        arg_params: &[],
    },
    MarketplaceDef {
        id: "linear",
        name: "Linear",
        command: "npx",
        args: &["-y", "@linear/mcp-server"],
        env_keys: &["LINEAR_API_KEY"],
        arg_params: &[],
    },
    // ── Automation ─────────────────────────────────────────────────────────────
    MarketplaceDef {
        id: "stripe",
        name: "Stripe",
        command: "npx",
        args: &["-y", "@stripe/mcp-server"],
        env_keys: &["STRIPE_SECRET_KEY"],
        arg_params: &[],
    },
];

/// Match by id first, then case-insensitive name contains.
pub fn find_server(query: &str) -> Option<&'static MarketplaceDef> {
    let lower = query.to_lowercase();
    MARKETPLACE
        .iter()
        .find(|s| s.id == query)
        .or_else(|| MARKETPLACE.iter().find(|s| s.name.to_lowercase().contains(&lower)))
}
