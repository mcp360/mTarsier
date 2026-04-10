# Export & Import

mTarsier lets you export your entire MCP setup — all clients, servers, and skills — as a single `.json` file. Use it to transfer your setup between machines, share configs with teammates, or create backups.

## Export

### Via GUI

1. Open **Settings** in the sidebar
2. Scroll to the **Flow** section
3. Click **Export**
4. The export dialog shows two tabs:
   - **MCP Servers** — lists all configured servers grouped by client
   - **Skills** — lists all installed skills grouped by client
5. Check/uncheck individual items to include or exclude them
6. Use **Select all** / **Deselect all** to toggle entire categories
7. Click **Export** — saves a `mtarsier-flow.json` file

The export file contains:

```json
{
  "version": "1.0",
  "exported_at": "1712745600",
  "clients": [
    {
      "id": "claude-desktop",
      "name": "Claude Desktop",
      "servers": [
        {
          "name": "filesystem",
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/projects"]
        }
      ],
      "skills": [
        {
          "name": "frontend-design",
          "description": "Create production-grade frontend interfaces",
          "content": "---\nname: \"frontend-design\"\n..."
        }
      ]
    }
  ]
}
```

## Import

### Via GUI

1. Open **Settings** in the sidebar
2. Scroll to the **Flow** section
3. Click **Import**
4. Select a `mtarsier-flow.json` file (or any `.json` flow file)
5. Choose a **target client** — all servers and skills from the file will be imported into this client
6. Toggle **Install skills** on/off depending on whether you want skills imported too
7. Click **Import**

### What happens during import

- **Servers** are merged into the target client's config. Existing servers with the same name are **skipped** (not overwritten).
- **Skills** are copied to the target client's skills directory. Existing skills with the same name are **skipped**.
- A config **backup** is created automatically before any changes.
- The import result shows exactly what was imported, skipped, and any errors.

### Import result summary

After import, you'll see:

| Status | Meaning |
|--------|---------|
| Imported servers | New servers added to the target client |
| Imported skills | New skills installed to the target client |
| Skipped servers | Server name already exists in target client |
| Skipped skills | Skill name already exists in target client |
| Skipped clients | Original client not installed on this machine |
| Errors | Any failures during import |

## Use Cases

### Transfer setup to a new machine

1. On the old machine: **Settings > Flow > Export**
2. Copy the `.json` file to the new machine (email, USB, cloud storage)
3. On the new machine: **Settings > Flow > Import** > select target client

### Share team config

1. Export your setup with the MCP servers your team needs
2. Share the `.json` file in Slack, GitHub, or your team docs
3. Each team member imports it into their preferred client

### Migrate between clients

1. Export from your current client (e.g., Claude Desktop)
2. Import into a different client (e.g., Cursor)
3. All your MCP servers are now in both clients

### Backup your setup

Export periodically to keep a snapshot of your full MCP configuration. Unlike the per-client config backups (which only save individual client configs), a flow export captures everything across all clients in one file.

## File Format

The flow file is plain JSON with this structure:

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Format version (currently `"1.0"`) |
| `exported_at` | string | Unix timestamp of export |
| `clients` | array | List of clients with their servers and skills |
| `clients[].id` | string | Client identifier (e.g., `claude-desktop`) |
| `clients[].name` | string | Display name (e.g., `Claude Desktop`) |
| `clients[].servers` | array | MCP server configs |
| `clients[].skills` | array | Skill definitions (name, description, full SKILL.md content) |

Servers contain `command` + `args` (for stdio) or `url` (for remote), plus optional `env` variables. Skills contain the full `SKILL.md` content so they can be reconstructed on import without needing the original source.

## Limitations

- Import does not overwrite existing servers or skills — it only adds new ones
- Skills with names containing `/`, `\`, or `..` are rejected during import
- Skill content is capped at 1 MB per skill
- The export only includes clients that have at least one server or skill configured
- Skills are only exported for clients that are actually installed on the machine
