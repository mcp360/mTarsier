use clap::{Parser, Subcommand};
use std::collections::HashMap;
use std::process;

use app_lib::commands::clients::{detect_installed_clients_sync, read_mcp_servers, DetectionRequest};
use app_lib::commands::server::{read_store, write_store, ServerEntry};
use app_lib::commands::skills::{delete_skill, list_skills, skills_install_blocking, skills_search};
use app_lib::commands::utils::{ensure_json_path, expand_config_key, expand_tilde};
use app_lib::marketplace::{find_server, MARKETPLACE};
use app_lib::registry::{find_client, platform_config_path, platform_skills_path, REGISTRY};

#[derive(Parser)]
#[command(
    name = "tsr",
    about = "mTarsier CLI — manage MCP servers from your terminal",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// List all MCP clients
    Clients {
        #[arg(long)]
        json: bool,
    },
    /// List MCP servers across all clients (or one)
    List {
        #[arg(long)]
        client: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Add a server to a client's config
    Add {
        name: String,
        #[arg(long)]
        client: String,
        #[arg(long)]
        command: Option<String>,
        #[arg(long, num_args = 0.., allow_hyphen_values = true)]
        args: Vec<String>,
        #[arg(long)]
        url: Option<String>,
        /// Bearer token for HTTP servers (written as Authorization header)
        #[arg(long)]
        bearer_token: Option<String>,
        /// Custom header in "Key: Value" format (repeatable)
        #[arg(long = "header", num_args = 1)]
        headers: Vec<String>,
        /// Environment variable in KEY=VALUE format (repeatable)
        #[arg(long = "env", num_args = 1)]
        env: Vec<String>,
        /// Overwrite if a server with this name already exists
        #[arg(long)]
        force: bool,
    },
    /// Remove a server from a client's config
    Remove {
        name: String,
        #[arg(long)]
        client: String,
    },
    /// Ping a server to check connectivity
    Ping {
        name: String,
        #[arg(long)]
        client: Option<String>,
    },
    /// Show or edit a client's config file (default: print path)
    Config {
        client_id: String,
        /// Open config in $EDITOR
        #[arg(long)]
        edit: bool,
        /// Print the config file contents to stdout
        #[arg(long)]
        show: bool,
    },
    /// Install a server from the marketplace
    Install {
        name: String,
        #[arg(long)]
        client: String,
        #[arg(long = "param", num_args = 1)]
        params: Vec<String>,
    },
    /// Disable a server (removes from client config, saves to mTarsier store)
    Disable {
        name: String,
        #[arg(long)]
        client: String,
    },
    /// Enable a previously-disabled server (restores to client config)
    Enable {
        name: String,
        #[arg(long)]
        client: String,
    },
    /// Manage skills for an AI client
    Skills {
        #[command(subcommand)]
        action: SkillsCommands,
    },
}

#[derive(Subcommand)]
enum SkillsCommands {
    /// List installed skills for a client
    List {
        #[arg(long)]
        client: String,
        #[arg(long)]
        json: bool,
    },
    /// Install a skill from a GitHub source (owner/repo or owner/repo/skill-name)
    Install {
        source: String,
        #[arg(long)]
        client: String,
        /// Specific skill name to install when the repo contains multiple skills
        #[arg(long)]
        name: Option<String>,
    },
    /// Remove an installed skill by name
    Remove {
        name: String,
        #[arg(long)]
        client: String,
    },
    /// Search the skills.sh registry for available skills
    Search {
        query: String,
        #[arg(long)]
        json: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        None => {
            use clap::CommandFactory;
            Cli::command().print_help().ok();
            println!();
        }
        Some(Commands::Clients { json }) => cmd_clients(json),
        Some(Commands::List { client, json }) => cmd_list(client, json),
        Some(Commands::Add {
            name,
            client,
            command,
            args,
            url,
            bearer_token,
            headers,
            env,
            force,
        }) => cmd_add(name, client, command, args, url, bearer_token, headers, env, force),
        Some(Commands::Remove { name, client }) => cmd_remove(name, client),
        Some(Commands::Ping { name, client }) => cmd_ping(name, client),
        Some(Commands::Config {
            client_id,
            edit,
            show,
        }) => cmd_config(client_id, edit, show),
        Some(Commands::Install {
            name,
            client,
            params,
        }) => cmd_install(name, client, params),
        Some(Commands::Disable { name, client }) => cmd_disable(name, client),
        Some(Commands::Enable { name, client }) => cmd_enable(name, client),
        Some(Commands::Skills { action }) => match action {
            SkillsCommands::List { client, json } => cmd_skills_list(client, json),
            SkillsCommands::Install { source, client, name } => cmd_skills_install(source, client, name),
            SkillsCommands::Remove { name, client } => cmd_skills_remove(name, client),
            SkillsCommands::Search { query, json } => cmd_skills_search(query, json),
        },
    }
}

// ─── Command implementations ──────────────────────────────────────────────────

fn cmd_clients(json: bool) {
    let requests: Vec<DetectionRequest> = REGISTRY
        .iter()
        .map(|c| DetectionRequest {
            client_id: c.id.to_string(),
            detection_kind: c.detection_kind.to_string(),
            detection_value: c.detection_value.map(String::from),
            detection_value_win: c.detection_value_win.map(String::from),
            detection_value_linux: c.detection_value_linux.map(String::from),
            config_path: platform_config_path(c).map(String::from),
            config_path_win: c.config_path_win.map(String::from),
            config_path_linux: c.config_path_linux.map(String::from),
            config_key: Some(c.config_key.to_string()),
        })
        .collect();

    let results = detect_installed_clients_sync(requests);

    if json {
        let json_arr: Vec<serde_json::Value> = results
            .iter()
            .filter_map(|r| {
                let client = find_client(&r.client_id)?;
                Some(serde_json::json!({
                    "id": r.client_id,
                    "name": client.name,
                    "type": client.client_type,
                    "installed": r.installed,
                    "server_count": r.server_count,
                    "config_path": platform_config_path(client),
                }))
            })
            .collect();
        match serde_json::to_string_pretty(&json_arr) {
            Ok(s) => println!("{}", s),
            Err(e) => {
                eprintln!("Error serializing JSON: {}", e);
                process::exit(1);
            }
        }
        return;
    }

    println!(
        "{:<24} {:<9} {:>4}  {}",
        "Client", "Type", "Srvs", "Config Path"
    );
    println!("{}", "─".repeat(80));
    for r in &results {
        let client = match find_client(&r.client_id) {
            Some(c) => c,
            None => continue,
        };
        let mark = if r.installed { "✓" } else { "✗" };
        let srv = r
            .server_count
            .map(|n| n.to_string())
            .unwrap_or_else(|| "—".to_string());
        let path = platform_config_path(client).unwrap_or("(no local config)");
        println!(
            "{} {:<22} {:<9} {:>4}  {}",
            mark, client.name, client.client_type, srv, path
        );
    }
}

fn cmd_list(client: Option<String>, json: bool) {
    if let Some(ref id) = client {
        if find_client(id).is_none() {
            eprintln!("Unknown client: {}", id);
            eprintln!(
                "Available: {}",
                REGISTRY.iter().map(|c| c.id).collect::<Vec<_>>().join(", ")
            );
            process::exit(1);
        }
    }

    let clients_to_check: Vec<_> = if let Some(ref id) = client {
        REGISTRY.iter().filter(|c| c.id == id.as_str()).collect()
    } else {
        REGISTRY.iter().collect()
    };

    let mut output: Vec<serde_json::Value> = Vec::new();

    for c in clients_to_check {
        let Some(path) = platform_config_path(c) else {
            continue;
        };
        if c.config_key.is_empty() {
            continue;
        }
        let abs_path = expand_tilde(path);
        if !abs_path.exists() {
            continue;
        }

        let servers = match read_mcp_servers(
            path.to_string(),
            c.config_key.to_string(),
            Some(c.config_format.to_string()),
        ) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let servers_json: Vec<serde_json::Value> = servers
            .iter()
            .map(|s| {
                let mut obj = serde_json::json!({
                    "name": s.name,
                    "command": s.command,
                    "args": s.args,
                    "url": s.url,
                });
                if let Some(ref env) = s.env {
                    obj["env"] = serde_json::json!(env);
                }
                if let Some(ref headers) = s.headers {
                    obj["headers"] = headers.clone();
                }
                if let Some(ref auth) = s.auth {
                    obj["auth"] = auth.clone();
                }
                obj
            })
            .collect();

        let disabled_json: Vec<serde_json::Value> = read_store(c.id)
            .unwrap_or_default()
            .into_iter()
            .filter(|(_, e)| !e.enabled)
            .map(|(name, e)| serde_json::json!({ "name": name, "config": e.config }))
            .collect();

        output.push(serde_json::json!({
            "client": c.name,
            "client_id": c.id,
            "servers": servers_json,
            "disabled_servers": disabled_json,
        }));
    }

    if json {
        match serde_json::to_string_pretty(&output) {
            Ok(s) => println!("{}", s),
            Err(e) => {
                eprintln!("Error serializing JSON: {}", e);
                process::exit(1);
            }
        }
        return;
    }

    if output.is_empty() {
        println!("No MCP servers found.");
        return;
    }

    for client_data in &output {
        let client_name = client_data["client"].as_str().unwrap_or("");
        let servers = client_data["servers"].as_array().map(Vec::as_slice).unwrap_or(&[]);
        let disabled = client_data["disabled_servers"].as_array().map(Vec::as_slice).unwrap_or(&[]);

        println!("\n── {} ──", client_name);
        if servers.is_empty() && disabled.is_empty() {
            println!("  (none)");
        } else {
            println!("  {:<30} {}", "Name", "Command / URL");
            println!("  {}", "─".repeat(60));
            for s in servers {
                let name = s["name"].as_str().unwrap_or("?");
                let cmd_str = if let Some(url) = s["url"].as_str() {
                    format!("url: {}", url)
                } else {
                    let cmd = s["command"].as_str().unwrap_or("?");
                    let args_str = s["args"]
                        .as_array()
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str())
                                .collect::<Vec<_>>()
                                .join(" ")
                        })
                        .unwrap_or_default();
                    if args_str.is_empty() { cmd.to_string() } else { format!("{} {}", cmd, args_str) }
                };
                println!("  {:<30} {}", name, cmd_str);
            }
            for d in disabled {
                let name = d["name"].as_str().unwrap_or("?");
                let cfg = &d["config"];
                let cmd_str = if let Some(url) = cfg["url"].as_str() {
                    format!("url: {}", url)
                } else {
                    let cmd = cfg["command"].as_str().unwrap_or("?");
                    let args_str = cfg["args"]
                        .as_array()
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str())
                                .collect::<Vec<_>>()
                                .join(" ")
                        })
                        .unwrap_or_default();
                    if args_str.is_empty() { cmd.to_string() } else { format!("{} {}", cmd, args_str) }
                };
                println!("  {:<30} {} [disabled]", name, cmd_str);
            }
        }
    }
}

fn cmd_disable(name: String, client: String) {
    let client_def = match find_client(&client) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client);
            process::exit(1);
        }
    };

    let path = match platform_config_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client);
            process::exit(1);
        }
    };

    // Read current servers to extract the server config
    let servers = match read_mcp_servers(
        path.to_string(),
        client_def.config_key.to_string(),
        Some(client_def.config_format.to_string()),
    ) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error reading config: {}", e);
            process::exit(1);
        }
    };

    let server = match servers.iter().find(|s| s.name == name) {
        Some(s) => s,
        None => {
            eprintln!("Server '{}' not found in {}", name, client_def.name);
            process::exit(1);
        }
    };

    // Build the config value from the server struct fields
    let mut config = serde_json::json!({});
    if let Some(ref cmd) = server.command {
        config["command"] = serde_json::json!(cmd);
    }
    if let Some(ref args) = server.args {
        if !args.is_empty() {
            config["args"] = serde_json::json!(args);
        }
    }
    if let Some(ref url) = server.url {
        config["url"] = serde_json::json!(url);
    }
    if let Some(ref env) = server.env {
        if !env.is_empty() {
            config["env"] = serde_json::json!(env);
        }
    }
    if let Some(ref headers) = server.headers {
        config["headers"] = headers.clone();
    }
    if let Some(ref auth) = server.auth {
        config["auth"] = auth.clone();
    }

    // Remove from client config first — if this fails, nothing is written to the store
    match remove_server(path, client_def.config_key, client_def.config_format, &name) {
        Ok(true) => {}
        Ok(false) => {
            eprintln!("Server '{}' not found when removing from {}", name, client_def.name);
            process::exit(1);
        }
        Err(e) => {
            eprintln!("Error removing from client config: {}", e);
            process::exit(1);
        }
    }

    // Update mTarsier store
    let mut store = read_store(client_def.id).unwrap_or_default();
    store.insert(name.clone(), ServerEntry {
        enabled: false,
        externally_removed: None,
        config,
    });
    if let Err(e) = write_store(client_def.id, &store) {
        eprintln!("Error writing mTarsier store: {}", e);
        process::exit(1);
    }

    println!("✓ Disabled {} (removed from {})", name, client_def.name);
}

fn cmd_enable(name: String, client: String) {
    let client_def = match find_client(&client) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client);
            process::exit(1);
        }
    };

    let path = match platform_config_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client);
            process::exit(1);
        }
    };

    let mut store = read_store(client_def.id).unwrap_or_default();
    let entry = match store.get(&name) {
        Some(e) if !e.enabled => e.clone(),
        Some(_) => {
            eprintln!("Server '{}' is already enabled in {}", name, client_def.name);
            process::exit(1);
        }
        None => {
            eprintln!("Server '{}' not found in mTarsier store for {}", name, client_def.name);
            process::exit(1);
        }
    };

    // Re-insert into client config
    match insert_server(
        path,
        client_def.config_key,
        client_def.config_format,
        &name,
        entry.config.clone(),
    ) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error adding to client config: {}", e);
            process::exit(1);
        }
    }

    // Update store to enabled
    store.insert(name.clone(), ServerEntry {
        enabled: true,
        externally_removed: None,
        config: entry.config,
    });
    if let Err(e) = write_store(client_def.id, &store) {
        eprintln!("Error writing mTarsier store: {}", e);
        process::exit(1);
    }

    println!("✓ Enabled {} (added back to {})", name, client_def.name);
}

fn cmd_config(client_id: String, edit: bool, show: bool) {
    let client = match find_client(&client_id) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client_id);
            eprintln!(
                "Available: {}",
                REGISTRY.iter().map(|c| c.id).collect::<Vec<_>>().join(", ")
            );
            process::exit(1);
        }
    };

    let path = match platform_config_path(client) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client_id);
            process::exit(1);
        }
    };

    if show {
        match std::fs::read_to_string(expand_tilde(path)) {
            Ok(content) => print!("{}", content),
            Err(e) => {
                eprintln!("Error reading config: {}", e);
                process::exit(1);
            }
        }
        return;
    }

    if edit {
        let editor = std::env::var("EDITOR").unwrap_or_else(|_| "nano".to_string());
        let abs_path = expand_tilde(path);
        match std::process::Command::new(&editor).arg(&abs_path).status() {
            Ok(_) => {}
            Err(e) => {
                eprintln!("Error opening editor '{}': {}", editor, e);
                process::exit(1);
            }
        }
        return;
    }

    println!("{}", expand_tilde(path).display());
}

fn cmd_add(
    name: String,
    client: String,
    command: Option<String>,
    args: Vec<String>,
    url: Option<String>,
    bearer_token: Option<String>,
    raw_headers: Vec<String>,
    raw_env: Vec<String>,
    force: bool,
) {
    if command.is_none() && url.is_none() {
        eprintln!("Error: must provide --command and/or --url");
        process::exit(1);
    }
    if url.is_none() && (bearer_token.is_some() || !raw_headers.is_empty()) {
        eprintln!("Error: --bearer-token and --header require --url");
        process::exit(1);
    }

    let client_def = match find_client(&client) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client);
            process::exit(1);
        }
    };

    let path = match platform_config_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client);
            process::exit(1);
        }
    };

    if !force {
        let existing = read_mcp_servers(
            path.to_string(),
            client_def.config_key.to_string(),
            Some(client_def.config_format.to_string()),
        ).unwrap_or_default();
        if existing.iter().any(|s| s.name == name) {
            eprintln!("Error: server '{}' already exists in {}. Use --force to overwrite.", name, client_def.name);
            process::exit(1);
        }
    }

    let mut entry = serde_json::json!({});
    if let Some(ref cmd) = command {
        entry["command"] = serde_json::json!(cmd);
    }
    if !args.is_empty() {
        entry["args"] = serde_json::json!(args);
    }
    if let Some(ref u) = url {
        entry["url"] = serde_json::json!(u);
    }
    if !raw_env.is_empty() {
        let mut env_map = serde_json::Map::new();
        for e in &raw_env {
            if let Some((key, val)) = e.split_once('=') {
                env_map.insert(key.to_string(), serde_json::json!(val));
            } else {
                eprintln!("Invalid env format '{}'. Expected KEY=VALUE", e);
                process::exit(1);
            }
        }
        entry["env"] = serde_json::Value::Object(env_map);
    }
    let mut headers_map = serde_json::Map::new();
    for h in &raw_headers {
        if let Some((key, val)) = h.split_once(':') {
            headers_map.insert(key.trim().to_string(), serde_json::json!(val.trim()));
        } else {
            eprintln!("Invalid header format '{}'. Expected 'Key: Value'", h);
            process::exit(1);
        }
    }
    if let Some(ref token) = bearer_token {
        headers_map.insert("Authorization".to_string(), serde_json::json!(format!("Bearer {}", token)));
    }
    if !headers_map.is_empty() {
        entry["headers"] = serde_json::Value::Object(headers_map);
    }

    match insert_server(
        path,
        client_def.config_key,
        client_def.config_format,
        &name,
        entry,
    ) {
        Ok(_) => println!("✓ Added {} to {}", name, client_def.name),
        Err(e) => {
            eprintln!("Error: {}", e);
            process::exit(1);
        }
    }
}

fn cmd_remove(name: String, client: String) {
    let client_def = match find_client(&client) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client);
            process::exit(1);
        }
    };

    let path = match platform_config_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client);
            process::exit(1);
        }
    };

    match remove_server(
        path,
        client_def.config_key,
        client_def.config_format,
        &name,
    ) {
        Ok(true) => println!("✓ Removed {} from {}", name, client_def.name),
        Ok(false) => {
            eprintln!("Server '{}' not found in {}", name, client_def.name);
            process::exit(1);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            process::exit(1);
        }
    }
}

fn cmd_ping(name: String, client: Option<String>) {
    if let Some(ref id) = client {
        if find_client(id).is_none() {
            eprintln!("Unknown client: {}", id);
            process::exit(1);
        }
    }

    let clients_to_check: Vec<_> = if let Some(ref id) = client {
        REGISTRY.iter().filter(|c| c.id == id.as_str()).collect()
    } else {
        REGISTRY.iter().collect()
    };

    for c in clients_to_check {
        let Some(path) = platform_config_path(c) else {
            continue;
        };
        if c.config_key.is_empty() {
            continue;
        }
        let abs_path = expand_tilde(path);
        if !abs_path.exists() {
            continue;
        }

        let servers = match read_mcp_servers(
            path.to_string(),
            c.config_key.to_string(),
            Some(c.config_format.to_string()),
        ) {
            Ok(s) => s,
            Err(_) => continue,
        };

        if let Some(server) = servers.iter().find(|s| s.name == name) {
            if let Some(ref url) = server.url {
                ping_url(&name, url);
            } else if let Some(ref cmd) = server.command {
                ping_command(&name, cmd);
            } else {
                eprintln!("Server '{}' has no command or URL to ping", name);
                process::exit(1);
            }
            return;
        }
    }

    eprintln!("Server '{}' not found", name);
    process::exit(1);
}

fn cmd_install(name: String, client: String, params: Vec<String>) {
    let server_def = match find_server(&name) {
        Some(s) => s,
        None => {
            eprintln!("Server '{}' not found in marketplace.", name);
            eprintln!("Available servers:");
            for s in MARKETPLACE {
                eprintln!("  {} ({})", s.id, s.name);
            }
            process::exit(1);
        }
    };

    let client_def = match find_client(&client) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client);
            process::exit(1);
        }
    };

    let path = match platform_config_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' has no local config file.", client);
            process::exit(1);
        }
    };

    // Parse --param KEY=VALUE pairs
    let mut param_map: HashMap<String, String> = HashMap::new();
    for p in &params {
        if let Some((key, val)) = p.split_once('=') {
            param_map.insert(key.to_string(), val.to_string());
        } else {
            eprintln!("Invalid param format '{}'. Expected KEY=VALUE", p);
            process::exit(1);
        }
    }

    // Check all required params are present
    let mut missing: Vec<&str> = Vec::new();
    for key in server_def.env_keys {
        if !param_map.contains_key(*key) {
            missing.push(key);
        }
    }
    for key in server_def.arg_params {
        if !param_map.contains_key(*key) {
            missing.push(key);
        }
    }
    if !missing.is_empty() {
        eprintln!("Missing required parameters: {}", missing.join(", "));
        eprintln!("Provide them with:");
        for m in &missing {
            eprintln!("  --param {}=<value>", m);
        }
        process::exit(1);
    }

    // Build resolved args (substitute {KEY} placeholders)
    let resolved_args: Vec<String> = server_def
        .args
        .iter()
        .map(|arg| {
            let mut resolved = arg.to_string();
            for (key, val) in &param_map {
                resolved = resolved.replace(&format!("{{{}}}", key), val);
            }
            resolved
        })
        .collect();

    // Build env map from env_keys
    let env_map: HashMap<String, String> = server_def
        .env_keys
        .iter()
        .filter_map(|key| param_map.get(*key).map(|val| (key.to_string(), val.clone())))
        .collect();

    let mut entry = serde_json::json!({
        "command": server_def.command,
        "args": resolved_args,
    });
    if !env_map.is_empty() {
        entry["env"] = serde_json::json!(env_map);
    }

    match insert_server(
        path,
        client_def.config_key,
        client_def.config_format,
        server_def.id,
        entry,
    ) {
        Ok(_) => {
            let abs_path = expand_tilde(path);
            println!("✓ Installed {} to {}", server_def.name, client_def.name);
            println!(
                "  Command: {} {}",
                server_def.command,
                resolved_args.join(" ")
            );
            println!("  Config:  {}", abs_path.display());
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            process::exit(1);
        }
    }
}

// ─── Config helpers ───────────────────────────────────────────────────────────

fn insert_server(
    config_path: &str,
    config_key: &str,
    config_format: &str,
    server_name: &str,
    entry: serde_json::Value,
) -> Result<(), String> {
    match config_format {
        "toml" => {
            let abs_path = expand_tilde(config_path);
            insert_server_toml(&abs_path, config_key, server_name, &entry)
        }
        "json-opencode" => insert_server_opencode(config_path, config_key, server_name, entry),
        _ => insert_server_json(config_path, config_key, server_name, entry),
    }
}

fn insert_server_opencode(
    config_path: &str,
    config_key: &str,
    server_name: &str,
    entry: serde_json::Value,
) -> Result<(), String> {
    let abs_path = expand_tilde(config_path);

    if let Some(parent) = abs_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let content = std::fs::read_to_string(&abs_path).unwrap_or_else(|_| "{}".to_string());
    let mut root: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON parse error: {}", e))?;

    let resolved_key = expand_config_key(config_key);
    let servers = ensure_json_path(&mut root, &resolved_key);

    let opencode_entry = if let Some(url) = entry.get("url").and_then(|v| v.as_str()) {
        serde_json::json!({ "type": "remote", "url": url, "enabled": true })
    } else {
        let cmd = entry.get("command").and_then(|v| v.as_str()).unwrap_or("");
        let args = entry
            .get("args")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let mut command_arr = vec![serde_json::json!(cmd)];
        command_arr.extend(args);
        let mut e = serde_json::json!({
            "type": "local",
            "command": command_arr,
            "enabled": true,
        });
        if let Some(env_obj) = entry.get("env").and_then(|v| v.as_object()) {
            if !env_obj.is_empty() {
                e["environment"] = serde_json::Value::Object(env_obj.clone());
            }
        }
        e
    };

    servers
        .as_object_mut()
        .ok_or_else(|| format!("'{}' is not a JSON object", config_key))?
        .insert(server_name.to_string(), opencode_entry);

    let new_content =
        serde_json::to_string_pretty(&root).map_err(|e| format!("Serialize error: {}", e))?;
    app_lib::commands::config::write_raw_config(config_path.to_string(), new_content)
}

fn insert_server_json(
    config_path: &str,
    config_key: &str,
    server_name: &str,
    entry: serde_json::Value,
) -> Result<(), String> {
    let abs_path = expand_tilde(config_path);

    if let Some(parent) = abs_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let content = std::fs::read_to_string(&abs_path).unwrap_or_else(|_| "{}".to_string());
    let mut root: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON parse error: {}", e))?;

    let resolved_key = expand_config_key(config_key);
    let servers = ensure_json_path(&mut root, &resolved_key);

    servers
        .as_object_mut()
        .ok_or_else(|| format!("Config key '{}' is not a JSON object", config_key))?
        .insert(server_name.to_string(), entry);

    let new_content =
        serde_json::to_string_pretty(&root).map_err(|e| format!("JSON serialize error: {}", e))?;

    app_lib::commands::config::write_raw_config(config_path.to_string(), new_content)
}

fn insert_server_toml(
    abs_path: &std::path::Path,
    config_key: &str,
    server_name: &str,
    entry: &serde_json::Value,
) -> Result<(), String> {
    let content = std::fs::read_to_string(abs_path).unwrap_or_default();
    let mut root: toml::Value = if content.trim().is_empty() {
        toml::Value::Table(toml::map::Map::new())
    } else {
        toml::from_str(&content).map_err(|e| format!("TOML parse error: {}", e))?
    };

    let mut current = &mut root;
    for key in config_key.split('.') {
        if !matches!(current, toml::Value::Table(_)) {
            *current = toml::Value::Table(toml::map::Map::new());
        }
        let toml::Value::Table(ref mut t) = current else {
            return Err(format!("Expected TOML table at '{}'", key));
        };
        if !t.contains_key(key) {
            t.insert(
                key.to_string(),
                toml::Value::Table(toml::map::Map::new()),
            );
        }
        current = t
            .get_mut(key)
            .ok_or_else(|| format!("Key '{}' not found", key))?;
    }

    let toml::Value::Table(ref mut servers_table) = current else {
        return Err(format!(
            "Config key '{}' is not a TOML table",
            config_key
        ));
    };
    servers_table.insert(server_name.to_string(), json_to_toml_value(entry));

    if let Some(parent) = abs_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let output =
        toml::to_string_pretty(&root).map_err(|e| format!("TOML serialize error: {}", e))?;
    std::fs::write(abs_path, output).map_err(|e| format!("Write error: {}", e))
}

fn remove_server(
    config_path: &str,
    config_key: &str,
    config_format: &str,
    server_name: &str,
) -> Result<bool, String> {
    if config_format == "toml" {
        let abs_path = expand_tilde(config_path);
        remove_server_toml(&abs_path, config_key, server_name)
    } else {
        remove_server_json(config_path, config_key, server_name)
    }
}

fn remove_server_json(
    config_path: &str,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    let abs_path = expand_tilde(config_path);
    let content = std::fs::read_to_string(&abs_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    let mut root: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON parse error: {}", e))?;

    let resolved_key = expand_config_key(config_key);
    let servers = ensure_json_path(&mut root, &resolved_key);
    let removed = servers
        .as_object_mut()
        .map(|obj| obj.remove(server_name).is_some())
        .unwrap_or(false);

    if removed {
        let new_content = serde_json::to_string_pretty(&root)
            .map_err(|e| format!("JSON serialize error: {}", e))?;
        app_lib::commands::config::write_raw_config(config_path.to_string(), new_content)?;
    }

    Ok(removed)
}

fn remove_server_toml(
    abs_path: &std::path::Path,
    config_key: &str,
    server_name: &str,
) -> Result<bool, String> {
    let content = std::fs::read_to_string(abs_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    let mut root: toml::Value =
        toml::from_str(&content).map_err(|e| format!("TOML parse error: {}", e))?;

    let mut current = &mut root;
    for key in config_key.split('.') {
        let toml::Value::Table(ref mut t) = current else {
            return Ok(false);
        };
        if !t.contains_key(key) {
            return Ok(false);
        }
        current = t
            .get_mut(key)
            .ok_or_else(|| format!("Key '{}' not found", key))?;
    }

    let removed = if let toml::Value::Table(ref mut t) = current {
        t.remove(server_name).is_some()
    } else {
        false
    };

    if removed {
        let output =
            toml::to_string_pretty(&root).map_err(|e| format!("TOML serialize error: {}", e))?;
        std::fs::write(abs_path, output).map_err(|e| format!("Write error: {}", e))?;
    }

    Ok(removed)
}

// ─── Ping helpers ─────────────────────────────────────────────────────────────

fn ping_url(name: &str, url: &str) {
    use std::net::ToSocketAddrs;

    let stripped = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);

    let default_port: u16 = if url.starts_with("https://") { 443 } else { 80 };
    let host_part = stripped.split('/').next().unwrap_or(stripped);

    let (host, port) = if let Some(colon_pos) = host_part.rfind(':') {
        let port_str = &host_part[colon_pos + 1..];
        let port = port_str.parse::<u16>().unwrap_or(default_port);
        (&host_part[..colon_pos], port)
    } else {
        (host_part, default_port)
    };

    let addr_str = format!("{}:{}", host, port);

    match addr_str.to_socket_addrs() {
        Ok(mut addrs) => match addrs.next() {
            Some(addr) => {
                match std::net::TcpStream::connect_timeout(
                    &addr,
                    std::time::Duration::from_secs(3),
                ) {
                    Ok(_) => println!("✓ {} is reachable ({})", name, addr_str),
                    Err(e) => {
                        eprintln!("✗ {} is unreachable: {}", name, e);
                        process::exit(1);
                    }
                }
            }
            None => {
                eprintln!("✗ {} — DNS returned no addresses for {}", name, addr_str);
                process::exit(1);
            }
        },
        Err(e) => {
            eprintln!("✗ {} — DNS resolution failed for {}: {}", name, addr_str, e);
            process::exit(1);
        }
    }
}

fn ping_command(name: &str, cmd: &str) {
    #[cfg(target_os = "windows")]
    let lookup_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let lookup_cmd = "which";

    match std::process::Command::new(lookup_cmd).arg(cmd).output() {
        Ok(output) => {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                println!("✓ {} — {} found in PATH: {}", name, cmd, path);
            } else {
                eprintln!("✗ {} — {} not found in PATH", name, cmd);
                process::exit(1);
            }
        }
        Err(e) => {
            eprintln!("Error running {}: {}", lookup_cmd, e);
            process::exit(1);
        }
    }
}

// ─── TOML conversion ──────────────────────────────────────────────────────────

fn json_to_toml_value(v: &serde_json::Value) -> toml::Value {
    match v {
        serde_json::Value::Null => toml::Value::String(String::new()),
        serde_json::Value::Bool(b) => toml::Value::Boolean(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                toml::Value::Integer(i)
            } else {
                toml::Value::Float(n.as_f64().unwrap_or(0.0))
            }
        }
        serde_json::Value::String(s) => toml::Value::String(s.clone()),
        serde_json::Value::Array(arr) => {
            toml::Value::Array(arr.iter().map(json_to_toml_value).collect())
        }
        serde_json::Value::Object(obj) => {
            let map = obj
                .iter()
                .map(|(k, v)| (k.clone(), json_to_toml_value(v)))
                .collect();
            toml::Value::Table(map)
        }
    }
}

// ─── Skills command implementations ──────────────────────────────────────────

fn resolve_client_skills_path(client_id: &str) -> (&'static str, &'static str) {
    let client_def = match find_client(client_id) {
        Some(c) => c,
        None => {
            eprintln!("Unknown client: {}", client_id);
            eprintln!(
                "Available: {}",
                REGISTRY.iter().map(|c| c.id).collect::<Vec<_>>().join(", ")
            );
            process::exit(1);
        }
    };
    let skills_path = match platform_skills_path(client_def) {
        Some(p) => p,
        None => {
            eprintln!("Client '{}' does not support skills.", client_def.name);
            process::exit(1);
        }
    };
    (client_def.name, skills_path)
}

fn cmd_skills_list(client: String, json: bool) {
    let (client_name, skills_path) = resolve_client_skills_path(&client);

    match list_skills(skills_path.to_string()) {
        Ok(skills) => {
            if json {
                let json_arr: Vec<serde_json::Value> = skills
                    .iter()
                    .map(|s| serde_json::json!({
                        "name": s.name,
                        "description": s.description,
                        "path": s.path,
                    }))
                    .collect();
                match serde_json::to_string_pretty(&json_arr) {
                    Ok(s) => println!("{}", s),
                    Err(e) => {
                        eprintln!("Error serializing JSON: {}", e);
                        process::exit(1);
                    }
                }
                return;
            }

            if skills.is_empty() {
                println!("No skills installed for {}.", client_name);
                println!("  Path: {}", expand_tilde(skills_path).display());
                return;
            }

            println!("\n── {} skills ({}) ──", client_name, skills_path);
            println!("  {:<30} {}", "Name", "Description");
            println!("  {}", "─".repeat(60));
            for s in &skills {
                println!("  {:<30} {}", s.name, s.description);
            }
        }
        Err(e) => {
            eprintln!("Error listing skills: {}", e);
            process::exit(1);
        }
    }
}

fn cmd_skills_install(source: String, client: String, name: Option<String>) {
    let (client_name, skills_path) = resolve_client_skills_path(&client);

    println!("Installing '{}' for {}...", source, client_name);

    match skills_install_blocking(source.clone(), vec![skills_path.to_string()], name) {
        Ok(installed) => {
            println!("✓ Installed '{}' to {}", installed, expand_tilde(skills_path).display());
        }
        Err(e) => {
            eprintln!("Error installing skill '{}': {}", source, e);
            process::exit(1);
        }
    }
}

fn cmd_skills_search(query: String, json: bool) {
    match skills_search(query.clone()) {
        Ok(results) => {
            if json {
                let json_arr: Vec<serde_json::Value> = results
                    .iter()
                    .map(|s| serde_json::json!({
                        "id": s.id,
                        "name": s.name,
                        "installs": s.installs,
                        "source": s.source,
                    }))
                    .collect();
                match serde_json::to_string_pretty(&json_arr) {
                    Ok(s) => println!("{}", s),
                    Err(e) => {
                        eprintln!("Error serializing JSON: {}", e);
                        process::exit(1);
                    }
                }
                return;
            }

            if results.is_empty() {
                println!("No skills found for '{}'.", query);
                return;
            }

            println!("\n── Skills matching '{}' ──", query);
            println!("  {:<30} {:>8}  {}", "Name", "Installs", "Source");
            println!("  {}", "─".repeat(70));
            for s in &results {
                let installs = s.installs.map(|n| n.to_string()).unwrap_or_else(|| "—".to_string());
                let source = s.source.as_deref().unwrap_or("—");
                println!("  {:<30} {:>8}  {}", s.name, installs, source);
            }

            // Show a concrete install example using the top result
            let example = results.first().and_then(|s| s.source.as_deref()).map(|src| {
                let first = results.first().unwrap();
                format!("{}/{}", src, first.name)
            });

            println!("\n── Install ──");
            if let Some(ex) = example {
                println!("  tsr skills install {} --client <client-id>", ex);
            } else {
                println!("  tsr skills install <source>/<skill-name> --client <client-id>");
            }

            // List clients that support skills
            let skill_clients: Vec<String> = REGISTRY
                .iter()
                .filter(|c| platform_skills_path(c).is_some())
                .map(|c| format!("  {:<20} ({})", c.id, c.name))
                .collect();
            println!("\n── Clients that support skills ──");
            for c in &skill_clients {
                println!("{}", c);
            }
        }
        Err(e) => {
            eprintln!("Search failed: {}", e);
            process::exit(1);
        }
    }
}

fn cmd_skills_remove(name: String, client: String) {
    let (client_name, skills_path) = resolve_client_skills_path(&client);

    let skill_path = format!("{}/{}", skills_path, name);

    match delete_skill(skill_path) {
        Ok(_) => println!("✓ Removed skill '{}' from {}", name, client_name),
        Err(e) => {
            eprintln!("Error removing skill '{}': {}", name, e);
            process::exit(1);
        }
    }
}
