use serde::{Deserialize, Serialize};

use super::utils::{expand_config_key, expand_tilde, navigate_json_key, silent_command};

#[derive(Debug, Deserialize)]
pub struct DetectionRequest {
    pub client_id: String,
    pub detection_kind: String,
    pub detection_value: Option<String>,
    #[serde(default)]
    pub detection_value_win: Option<String>,
    #[serde(default)]
    pub detection_value_linux: Option<String>,
    pub config_path: Option<String>,
    #[serde(default)]
    pub config_path_win: Option<String>,
    #[serde(default)]
    pub config_path_linux: Option<String>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<serde_json::Value>,
}


/// Probe known binary directories that may not be in PATH when a GUI app launches.
/// On macOS/Linux: Homebrew, Claude native installer, npm globals, bun, cargo, volta, nix.
/// On Windows: npm global, bun, cargo, volta, Scoop, Chocolatey, winget.
fn probe_binary_dirs(name: &str) -> bool {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return false,
    };

    #[cfg(target_os = "windows")]
    {
        // npm global installs on Windows create .cmd shims (not .exe).
        // Also check bare name and .exe for non-npm tools.
        let name_exe = format!("{}.exe", name);
        let name_cmd = format!("{}.cmd", name);
        let name_ps1 = format!("{}.ps1", name);
        let candidates: &[std::path::PathBuf] = &[
            home.join("AppData\\Roaming\\npm"),
            home.join("AppData\\Local\\Programs\\nodejs"),
            home.join(".bun\\bin"),
            home.join(".cargo\\bin"),
            home.join(".volta\\bin"),
            home.join(".deno\\bin"),
            home.join("scoop\\shims"),
            std::path::PathBuf::from("C:\\ProgramData\\chocolatey\\bin"),
            std::path::PathBuf::from("C:\\Program Files\\nodejs"),
        ];
        return candidates.iter().any(|dir| {
            dir.join(name).exists()
                || dir.join(&name_exe).exists()
                || dir.join(&name_cmd).exists()
                || dir.join(&name_ps1).exists()
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let candidates: &[std::path::PathBuf] = &[
            "/usr/local/bin".into(),
            "/opt/homebrew/bin".into(),
            "/usr/bin".into(),
            "/snap/bin".into(),         // Ubuntu snap packages
            "/usr/local/sbin".into(),
            home.join(".local/bin"),
            home.join(".npm-global/bin"),
            home.join(".bun/bin"),
            home.join(".cargo/bin"),
            home.join(".volta/bin"),
            home.join(".deno/bin"),
            home.join(".nix-profile/bin"),
        ];
        return candidates.iter().any(|dir| dir.join(name).exists());
    }
}

pub fn check_installed(kind: &str, value: Option<&str>) -> bool {
    match kind {
        "app_bundle" => {
            // expand_tilde handles %VAR% on Windows and ~/ on all platforms.
            // Multiple paths can be separated by "|" to support alternate install locations.
            if let Some(paths) = value {
                for path in paths.split('|') {
                    let expanded = expand_tilde(path.trim());
                    if expanded.exists() {
                        return true;
                    }
                    #[cfg(target_os = "macos")]
                    {
                        if let (Some(home), Some(app_name)) = (dirs::home_dir(), expanded.file_name()) {
                            // Some apps are installed per-user under ~/Applications instead of /Applications.
                            if home.join("Applications").join(app_name).exists() {
                                return true;
                            }
                        }
                    }
                }
                false
            } else {
                false
            }
        }
        "cli_binary" => {
            if let Some(name) = value {
                // Primary: use `where` on Windows, `which` on Unix.
                // (fix-path-env-rs restores the shell PATH on macOS/Linux at startup.)
                #[cfg(target_os = "windows")]
                let lookup_cmd = "where";
                #[cfg(not(target_os = "windows"))]
                let lookup_cmd = "which";

                let found_via_lookup = silent_command(lookup_cmd)
                    .arg(name)
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);

                // Fallback: probe known install locations directly.
                found_via_lookup || probe_binary_dirs(name)
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

pub fn detect_installed_clients_sync(clients: Vec<DetectionRequest>) -> Vec<DetectionResult> {
    clients
        .iter()
        .map(|req| {
            // Pick platform-specific detection value for app_bundle; CLI names are the same everywhere.
            #[cfg(target_os = "windows")]
            let detection_value = req.detection_value_win.as_deref()
                .or(req.detection_value.as_deref());
            #[cfg(target_os = "linux")]
            let detection_value = req.detection_value_linux.as_deref()
                .or(req.detection_value.as_deref());
            #[cfg(not(any(target_os = "windows", target_os = "linux")))]
            let detection_value = req.detection_value.as_deref();

            let installed = check_installed(&req.detection_kind, detection_value);

            // Resolve platform-appropriate config path.
            #[cfg(target_os = "windows")]
            let resolved_config_path = req.config_path_win.as_deref()
                .or(req.config_path.as_deref());
            #[cfg(target_os = "linux")]
            let resolved_config_path = req.config_path_linux.as_deref()
                .or(req.config_path.as_deref());
            #[cfg(not(any(target_os = "windows", target_os = "linux")))]
            let resolved_config_path = req.config_path.as_deref();

            // expand_tilde handles %VAR% on Windows, so no separate expansion needed.
            let config_exists = resolved_config_path
                .map(|p| expand_tilde(p).exists())
                .unwrap_or(false);
            let server_count = if config_exists {
                if let (Some(cp), Some(ck)) = (resolved_config_path, req.config_key.as_deref()) {
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
pub async fn detect_installed_clients(clients: Vec<DetectionRequest>) -> Vec<DetectionResult> {
    tauri::async_runtime::spawn_blocking(move || detect_installed_clients_sync(clients))
        .await
        .unwrap_or_default()
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

    if config_format.as_deref() == Some("json-opencode") {
        let json: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;
        let resolved_key = expand_config_key(&config_key);
        let servers = navigate_json_key(&json, &resolved_key)
            .ok_or_else(|| format!("Key '{}' not found", resolved_key))?;
        let obj = servers
            .as_object()
            .ok_or_else(|| format!("'{}' is not an object", config_key))?;

        let entries = obj
            .iter()
            .map(|(name, val)| {
                let (command, args) = match val.get("command").and_then(|v| v.as_array()) {
                    Some(arr) => {
                        let mut strs =
                            arr.iter().filter_map(|v| v.as_str().map(String::from));
                        let cmd = strs.next();
                        let rest: Vec<String> = strs.collect();
                        (cmd, if rest.is_empty() { None } else { Some(rest) })
                    }
                    None => (None, None),
                };
                let env = val.get("environment").and_then(|v| v.as_object()).map(|o| {
                    o.iter()
                        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                        .collect()
                });
                let url = val.get("url").and_then(|v| v.as_str()).map(String::from);
                McpServerEntry {
                    name: name.clone(),
                    command,
                    args,
                    env,
                    url,
                    headers: None,
                    auth: None,
                }
            })
            .collect();
        return Ok(entries);
    }

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
                    headers: None,
                    auth: None,
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
            let headers = val.get("headers").cloned();
            let auth = val.get("auth").cloned();
            McpServerEntry {
                name: name.clone(),
                command,
                args,
                env,
                url,
                headers,
                auth,
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
