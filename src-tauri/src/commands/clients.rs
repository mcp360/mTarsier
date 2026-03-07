use serde::{Deserialize, Serialize};
use std::process::Command;

use super::utils::{expand_config_key, expand_tilde, navigate_json_key};

#[derive(Debug, Deserialize)]
pub struct DetectionRequest {
    pub client_id: String,
    pub detection_kind: String,
    pub detection_value: Option<String>,
    pub config_path: Option<String>,
    pub config_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DetectionResult {
    pub client_id: String,
    pub installed: bool,
    pub config_exists: bool,
    pub server_count: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct McpServerEntry {
    pub name: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<std::collections::HashMap<String, String>>,
    pub url: Option<String>,
}

fn check_installed(kind: &str, value: Option<&str>) -> bool {
    match kind {
        "app_bundle" => {
            if let Some(path) = value {
                std::path::Path::new(path).exists()
            } else {
                false
            }
        }
        "cli_binary" => {
            if let Some(name) = value {
                Command::new("which")
                    .arg(name)
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false)
            } else {
                false
            }
        }
        "vscode_extension" => {
            if let Some(id) = value {
                let id_lower = id.to_lowercase();
                if let Some(home) = dirs::home_dir() {
                    let ext_dir = home.join(".vscode/extensions");
                    if let Ok(entries) = std::fs::read_dir(&ext_dir) {
                        return entries
                            .filter_map(|e| e.ok())
                            .any(|e| {
                                e.file_name()
                                    .to_string_lossy()
                                    .to_lowercase()
                                    .starts_with(&id_lower)
                            });
                    }
                }
                false
            } else {
                false
            }
        }
        _ => false,
    }
}

fn count_servers(config_path: &str, config_key: &str) -> Option<u32> {
    let path = expand_tilde(config_path);
    let content = std::fs::read_to_string(&path).ok()?;

    if config_path.ends_with(".toml") {
        let toml_val: toml::Value = toml::from_str(&content).ok()?;
        let mut current = &toml_val;
        for part in config_key.split('.') {
            current = current.as_table()?.get(part)?;
        }
        return Some(current.as_table()?.len() as u32);
    }

    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let resolved_key = expand_config_key(config_key);
    let servers = navigate_json_key(&json, &resolved_key)?;
    Some(servers.as_object()?.len() as u32)
}

#[tauri::command]
pub fn detect_installed_clients(clients: Vec<DetectionRequest>) -> Vec<DetectionResult> {
    clients
        .iter()
        .map(|req| {
            let installed = check_installed(&req.detection_kind, req.detection_value.as_deref());
            let config_exists = req
                .config_path
                .as_ref()
                .map(|p| expand_tilde(p).exists())
                .unwrap_or(false);
            let server_count = if config_exists {
                if let (Some(cp), Some(ck)) = (&req.config_path, &req.config_key) {
                    if !ck.is_empty() {
                        count_servers(cp, ck)
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };
            DetectionResult {
                client_id: req.client_id.clone(),
                installed,
                config_exists,
                server_count,
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_client_config(config_path: String) -> Result<String, String> {
    let path = expand_tilde(&config_path);
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))
}

#[tauri::command]
pub fn read_mcp_servers(
    config_path: String,
    config_key: String,
    config_format: Option<String>,
) -> Result<Vec<McpServerEntry>, String> {
    let path = expand_tilde(&config_path);
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    if config_format.as_deref() == Some("toml") {
        let toml_val: toml::Value =
            toml::from_str(&content).map_err(|e| format!("Failed to parse TOML: {}", e))?;
        let mut current = &toml_val;
        for part in config_key.split('.') {
            current = current
                .as_table()
                .and_then(|t| t.get(part))
                .ok_or_else(|| format!("Key '{}' not found in TOML config", part))?;
        }
        let table = current
            .as_table()
            .ok_or_else(|| format!("'{}' is not a TOML table", config_key))?;

        let entries = table
            .iter()
            .map(|(name, val)| {
                let command = val.get("command").and_then(|v| v.as_str()).map(String::from);
                let args = val.get("args").and_then(|v| {
                    v.as_array().map(|arr| {
                        arr.iter()
                            .filter_map(|a| a.as_str().map(String::from))
                            .collect()
                    })
                });
                let env = val.get("env").and_then(|v| {
                    v.as_table().map(|t| {
                        t.iter()
                            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                            .collect()
                    })
                });
                let url = val.get("url").and_then(|v| v.as_str()).map(String::from);
                McpServerEntry {
                    name: name.clone(),
                    command,
                    args,
                    env,
                    url,
                }
            })
            .collect();
        return Ok(entries);
    }

    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let resolved_key = expand_config_key(&config_key);
    let servers = navigate_json_key(&json, &resolved_key)
        .ok_or_else(|| format!("Key '{}' not found in config", resolved_key))?;

    let obj = servers
        .as_object()
        .ok_or_else(|| format!("'{}' is not an object", config_key))?;

    let entries = obj
        .iter()
        .map(|(name, val)| {
            let command = val.get("command").and_then(|v| v.as_str()).map(String::from);
            let args = val.get("args").and_then(|v| {
                v.as_array().map(|arr| {
                    arr.iter()
                        .filter_map(|a| a.as_str().map(String::from))
                        .collect()
                })
            });
            let env = val.get("env").and_then(|v| {
                v.as_object().map(|obj| {
                    obj.iter()
                        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                        .collect()
                })
            });
            let url = val.get("url").and_then(|v| v.as_str()).map(String::from);
            McpServerEntry {
                name: name.clone(),
                command,
                args,
                env,
                url,
            }
        })
        .collect();

    Ok(entries)
}

#[derive(Debug, Serialize)]
pub struct ProjectScope {
    pub path: String,
    pub server_count: u32,
}

/// List all Claude Code project paths that have mcpServers entries
#[tauri::command]
pub fn list_claude_code_scopes(config_path: String) -> Result<Vec<ProjectScope>, String> {
    let path = expand_tilde(&config_path);
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))?;
    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let projects = match json.get("projects").and_then(|p| p.as_object()) {
        Some(p) => p,
        None => return Ok(vec![]),
    };

    let mut scopes: Vec<ProjectScope> = projects
        .iter()
        .filter_map(|(project_path, project_data)| {
            let servers = project_data.get("mcpServers")?.as_object()?;
            if servers.is_empty() {
                return None;
            }
            Some(ProjectScope {
                path: project_path.clone(),
                server_count: servers.len() as u32,
            })
        })
        .collect();

    scopes.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(scopes)
}
