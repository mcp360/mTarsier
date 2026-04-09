use serde::{Deserialize, Serialize};

use crate::commands::clients::{check_installed, read_mcp_servers};
use crate::commands::skills::list_skills;
use crate::registry::{find_client, platform_config_path, platform_skills_path, REGISTRY};

// ─── Data model ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowServer {
    pub name: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub url: Option<String>,
    pub env: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowClient {
    pub id: String,
    pub name: String,
    pub servers: Vec<FlowServer>,
    pub skills: Vec<FlowSkill>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowSkill {
    pub name: String,
    pub description: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlowExport {
    pub version: String,
    pub exported_at: String,
    pub clients: Vec<FlowClient>,
}

// ─── Import result ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct FlowImportResult {
    pub imported_servers: u32,
    pub imported_skills: u32,
    pub skipped_clients: Vec<String>,
    pub skipped_servers: Vec<String>,
    pub skipped_skills: Vec<String>,
    pub errors: Vec<String>,
}

// ─── Export ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_flow() -> Result<String, String> {
    let mut clients_out: Vec<FlowClient> = Vec::new();

    for client_def in REGISTRY.iter() {
        let client_id = client_def.id;

        // Read MCP servers
        let servers = match platform_config_path(client_def) {
            Some(path) if !client_def.config_key.is_empty() => {
                read_mcp_servers(
                    path.to_string(),
                    client_def.config_key.to_string(),
                    Some(client_def.config_format.to_string()),
                )
                .unwrap_or_default()
            }
            _ => vec![],
        };

        let flow_servers: Vec<FlowServer> = servers
            .into_iter()
            .map(|s| FlowServer {
                name: s.name,
                command: s.command,
                args: s.args,
                url: s.url,
                env: s.env,
            })
            .collect();

        // Only read skills if the client binary/app is actually installed on this machine
        #[cfg(target_os = "windows")]
        let detection_value = client_def.detection_value_win.or(client_def.detection_value);
        #[cfg(target_os = "linux")]
        let detection_value = client_def.detection_value_linux.or(client_def.detection_value);
        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        let detection_value = client_def.detection_value;

        let client_is_installed = check_installed(client_def.detection_kind, detection_value);

        let flow_skills: Vec<FlowSkill> = if client_is_installed {
            match platform_skills_path(client_def) {
                Some(skills_path) => list_skills(skills_path.to_string())
                    .unwrap_or_default()
                    .into_iter()
                    .map(|s| FlowSkill {
                        name: s.name,
                        description: s.description,
                        content: s.raw_content,
                    })
                    .collect(),
                None => vec![],
            }
        } else {
            vec![]
        };

        // Skip clients with no servers and no skills
        if flow_servers.is_empty() && flow_skills.is_empty() {
            continue;
        }

        clients_out.push(FlowClient {
            id: client_id.to_string(),
            name: client_def.name.to_string(),
            servers: flow_servers,
            skills: flow_skills,
        });
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let export = FlowExport {
        version: "1.0".to_string(),
        exported_at: now.to_string(),
        clients: clients_out,
    };

    serde_json::to_string_pretty(&export).map_err(|e| format!("Failed to serialize flow: {e}"))
}

// ─── Import ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn import_flow(
    content: String,
    target_client_id: String,
    install_skills: bool,
) -> Result<FlowImportResult, String> {
    let flow: FlowExport =
        serde_json::from_str(&content).map_err(|e| format!("Invalid flow file: {e}"))?;

    let target_client = find_client(&target_client_id)
        .ok_or_else(|| format!("Unknown client: {}", target_client_id))?;

    let config_path = platform_config_path(target_client)
        .ok_or_else(|| format!("Client '{}' has no local config", target_client_id))?;

    let mut result = FlowImportResult {
        imported_servers: 0,
        imported_skills: 0,
        skipped_clients: vec![],
        skipped_servers: vec![],
        skipped_skills: vec![],
        errors: vec![],
    };

    // Read existing servers to detect conflicts
    let existing_servers = read_mcp_servers(
        config_path.to_string(),
        target_client.config_key.to_string(),
        Some(target_client.config_format.to_string()),
    )
    .unwrap_or_default();
    let existing_names: std::collections::HashSet<String> =
        existing_servers.into_iter().map(|s| s.name).collect();

    // Read current config file for merging
    let abs_path = crate::commands::utils::expand_tilde(config_path);
    let raw_content = std::fs::read_to_string(&abs_path)
        .unwrap_or_default()
        .trim()
        .to_string();

    let config_format = target_client.config_format;
    let resolved_key = crate::commands::utils::expand_config_key(target_client.config_key);

    // Parse config based on format (JSON, TOML, or json-opencode)
    let mut root: serde_json::Value = match config_format {
        "toml" => {
            if raw_content.is_empty() {
                serde_json::json!({})
            } else {
                let toml_val: toml::Value = toml::from_str(&raw_content)
                    .map_err(|e| format!("Failed to parse target config: {e}"))?;
                crate::commands::config::toml_to_json(toml_val)
            }
        }
        _ => {
            let c = if raw_content.is_empty() { "{}".to_string() } else { raw_content };
            serde_json::from_str(&c)
                .map_err(|e| format!("Failed to parse target config: {e}"))?
        }
    };

    let servers_obj = crate::commands::utils::ensure_json_path(&mut root, &resolved_key);

    for flow_client in &flow.clients {
        // Check if the original client is installed on this machine
        let original_installed = find_client(&flow_client.id)
            .and_then(|c| platform_config_path(c))
            .map(|p| crate::commands::utils::expand_tilde(p).exists())
            .unwrap_or(false);

        if !original_installed && flow_client.id != target_client_id {
            result
                .skipped_clients
                .push(format!("{} (not installed)", flow_client.name));
        }

        // Import servers
        for server in &flow_client.servers {
            if existing_names.contains(&server.name) {
                result
                    .skipped_servers
                    .push(format!("{} (already exists)", server.name));
                continue;
            }

            let mut entry = serde_json::json!({});
            if let Some(ref cmd) = server.command {
                entry["command"] = serde_json::json!(cmd);
            }
            if let Some(ref args) = server.args {
                if !args.is_empty() {
                    entry["args"] = serde_json::json!(args);
                }
            }
            if let Some(ref url) = server.url {
                entry["url"] = serde_json::json!(url);
            }
            if let Some(ref env) = server.env {
                if !env.is_empty() {
                    entry["env"] = serde_json::json!(env);
                }
            }

            if let Some(obj) = servers_obj.as_object_mut() {
                obj.insert(server.name.clone(), entry);
                result.imported_servers += 1;
            }
        }

        // Import skills if requested
        if install_skills {
            if let Some(skills_path) = platform_skills_path(target_client) {
                let skills_dir = crate::commands::utils::expand_tilde(skills_path);
                for skill in &flow_client.skills {
                    // Reject names that could escape the skills directory
                    if skill.name.is_empty()
                        || skill.name.contains('/')
                        || skill.name.contains('\\')
                        || skill.name.contains("..")
                    {
                        result
                            .errors
                            .push(format!("Skill '{}' has an invalid name", skill.name));
                        continue;
                    }
                    // Reject oversized content (1 MB limit)
                    const MAX_SKILL_BYTES: usize = 1024 * 1024;
                    if skill.content.len() > MAX_SKILL_BYTES {
                        result
                            .errors
                            .push(format!("Skill '{}' content exceeds 1 MB limit", skill.name));
                        continue;
                    }
                    let skill_dir = skills_dir.join(&skill.name);
                    // Belt-and-suspenders: confirm resolved path stays within skills_dir
                    if !skill_dir.starts_with(&skills_dir) {
                        result
                            .errors
                            .push(format!("Skill '{}' resolved outside skills directory", skill.name));
                        continue;
                    }
                    if skill_dir.exists() {
                        result
                            .skipped_skills
                            .push(format!("{} (already exists)", skill.name));
                        continue;
                    }
                    match std::fs::create_dir_all(&skill_dir) {
                        Ok(_) => {
                            let skill_file = skill_dir.join("SKILL.md");
                            match std::fs::write(&skill_file, &skill.content) {
                                Ok(_) => result.imported_skills += 1,
                                Err(e) => result
                                    .errors
                                    .push(format!("Failed to write skill {}: {}", skill.name, e)),
                            }
                        }
                        Err(e) => result
                            .errors
                            .push(format!("Failed to create skill dir {}: {}", skill.name, e)),
                    }
                }
            }
        }
    }

    // Write updated config back in the correct format
    let new_content = match config_format {
        "toml" => {
            let toml_val = crate::commands::config::json_to_toml(root)
                .unwrap_or(toml::Value::Table(toml::map::Map::new()));
            toml::to_string_pretty(&toml_val)
                .map_err(|e| format!("Serialize error: {e}"))?
        }
        _ => serde_json::to_string_pretty(&root)
            .map_err(|e| format!("Serialize error: {e}"))?
    };

    let abs_path = crate::commands::utils::expand_tilde(config_path);
    if let Some(parent) = abs_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {e}"))?;
    }
    std::fs::write(&abs_path, &new_content)
        .map_err(|e| format!("Failed to write config: {e}"))?;

    Ok(result)
}
