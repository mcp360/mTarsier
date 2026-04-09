use serde::{Deserialize, Serialize};

use super::audit::append_entry;
use super::utils::{backup_dir, ensure_json_path, expand_config_key, expand_tilde};

#[derive(Debug, Serialize)]
pub struct BackupEntry {
    pub filename: String,
    pub timestamp: String,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct WriteConfigRequest {
    pub config_path: String,
    pub config_key: String,
    pub config_format: String,
    pub servers: serde_json::Value,
}

// ─── TOML helpers ─────────────────────────────────────────────────────────────

pub fn toml_to_json(v: toml::Value) -> serde_json::Value {
    match v {
        toml::Value::String(s) => serde_json::Value::String(s),
        toml::Value::Integer(i) => serde_json::Value::Number(i.into()),
        toml::Value::Float(f) => serde_json::Number::from_f64(f)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        toml::Value::Boolean(b) => serde_json::Value::Bool(b),
        toml::Value::Datetime(dt) => serde_json::Value::String(dt.to_string()),
        toml::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(toml_to_json).collect())
        }
        toml::Value::Table(t) => serde_json::Value::Object(
            t.into_iter().map(|(k, v)| (k, toml_to_json(v))).collect(),
        ),
    }
}

pub fn json_to_toml(v: serde_json::Value) -> Option<toml::Value> {
    match v {
        serde_json::Value::Null => None,
        serde_json::Value::Bool(b) => Some(toml::Value::Boolean(b)),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Some(toml::Value::Integer(i))
            } else {
                n.as_f64().map(toml::Value::Float)
            }
        }
        serde_json::Value::String(s) => Some(toml::Value::String(s)),
        serde_json::Value::Array(arr) => Some(toml::Value::Array(
            arr.into_iter().filter_map(json_to_toml).collect(),
        )),
        serde_json::Value::Object(obj) => {
            let table: toml::map::Map<String, toml::Value> = obj
                .into_iter()
                .filter_map(|(k, v)| json_to_toml(v).map(|tv| (k, tv)))
                .collect();
            Some(toml::Value::Table(table))
        }
    }
}

/// Navigate a dot-separated key path in a TOML value and return the target section as JSON.
fn extract_toml_servers(content: &str, config_key: &str) -> serde_json::Value {
    let Ok(toml_val) = toml::from_str::<toml::Value>(content) else {
        return serde_json::json!({});
    };
    if config_key.is_empty() {
        return toml_to_json(toml_val);
    }
    let mut current = &toml_val;
    for part in config_key.split('.') {
        match current {
            toml::Value::Table(t) => {
                if let Some(v) = t.get(part) {
                    current = v;
                } else {
                    return serde_json::json!({});
                }
            }
            _ => return serde_json::json!({}),
        }
    }
    toml_to_json(current.clone())
}

/// Navigate/create a dot-separated key path in a TOML value and set the leaf to `new_value`.
fn set_toml_path(value: &mut toml::Value, keys: &[&str], new_value: toml::Value) {
    if keys.is_empty() {
        *value = new_value;
        return;
    }
    if !matches!(value, toml::Value::Table(_)) {
        *value = toml::Value::Table(toml::map::Map::new());
    }
    let toml::Value::Table(table) = value else {
        unreachable!()
    };
    if keys.len() == 1 {
        table.insert(keys[0].to_string(), new_value);
    } else {
        let entry = table
            .entry(keys[0].to_string())
            .or_insert_with(|| toml::Value::Table(toml::map::Map::new()));
        set_toml_path(entry, &keys[1..], new_value);
    }
}

// ─── OpenCode helpers ──────────────────────────────────────────────────────────

fn convert_servers_to_opencode(servers: &serde_json::Value) -> serde_json::Value {
    let Some(obj) = servers.as_object() else {
        return serde_json::json!({});
    };
    let converted: serde_json::Map<String, serde_json::Value> = obj
        .iter()
        .map(|(name, entry)| {
            let opencode_entry = if let Some(url) = entry.get("url").and_then(|v| v.as_str()) {
                serde_json::json!({ "type": "remote", "url": url, "enabled": true })
            } else {
                // command may arrive as a string (standard format) or array (raw OpenCode
                // format round-tripped through extractServersFromJson in the UI)
                let (cmd, args) = if let Some(arr) =
                    entry.get("command").and_then(|v| v.as_array())
                {
                    let mut strs = arr.iter().filter_map(|v| v.as_str());
                    let cmd = strs.next().unwrap_or("").to_string();
                    let rest: Vec<serde_json::Value> =
                        strs.map(|s| serde_json::json!(s)).collect();
                    (cmd, rest)
                } else {
                    let cmd = entry
                        .get("command")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let rest = entry
                        .get("args")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    (cmd, rest)
                };
                let mut command_arr = vec![serde_json::json!(cmd)];
                command_arr.extend(args);
                let mut e = serde_json::json!({
                    "type": "local",
                    "command": command_arr,
                    "enabled": true,
                });
                // env key in standard format, environment key in raw OpenCode format
                let env_obj = entry
                    .get("env")
                    .and_then(|v| v.as_object())
                    .or_else(|| entry.get("environment").and_then(|v| v.as_object()));
                if let Some(env_obj) = env_obj {
                    if !env_obj.is_empty() {
                        e["environment"] = serde_json::Value::Object(env_obj.clone());
                    }
                }
                e
            };
            (name.clone(), opencode_entry)
        })
        .collect();
    serde_json::Value::Object(converted)
}

/// Ensure every server entry that has a `url` but no `command` and no `type`
/// gets `"type": "http"` injected. Claude Code (and other clients) require
/// the type discriminator to recognise HTTP-transport servers.
fn normalize_mcp_servers(servers: serde_json::Value) -> serde_json::Value {
    let Some(obj) = servers.as_object() else {
        return servers;
    };
    let normalized: serde_json::Map<String, serde_json::Value> = obj
        .iter()
        .map(|(name, entry)| {
            let entry = if let Some(map) = entry.as_object() {
                if map.contains_key("url")
                    && !map.contains_key("command")
                    && !map.contains_key("type")
                {
                    let mut m = map.clone();
                    m.insert("type".to_string(), serde_json::json!("http"));
                    serde_json::Value::Object(m)
                } else {
                    entry.clone()
                }
            } else {
                entry.clone()
            };
            (name.clone(), entry)
        })
        .collect();
    serde_json::Value::Object(normalized)
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Parse raw TOML content and return the servers section as a JSON string.
/// Used by the frontend for TOML-format clients (Codex).
#[tauri::command]
pub fn parse_toml_servers(content: String, config_key: String) -> Result<String, String> {
    let servers = extract_toml_servers(&content, &config_key);
    serde_json::to_string_pretty(&servers).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
pub fn write_client_config(request: WriteConfigRequest) -> Result<(), String> {
    let path = expand_tilde(&request.config_path);
    let resolved_key = expand_config_key(&request.config_key);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    match request.config_format.as_str() {
        "toml" => {
            let mut toml_val: toml::Value = if path.exists() {
                let existing = std::fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read config: {}", e))?;
                toml::from_str(&existing).map_err(|e| format!("Failed to parse TOML: {}", e))?
            } else {
                toml::Value::Table(toml::map::Map::new())
            };

            let toml_servers = json_to_toml(request.servers.clone())
                .unwrap_or(toml::Value::Table(toml::map::Map::new()));
            let keys: Vec<&str> = resolved_key.split('.').collect();
            set_toml_path(&mut toml_val, &keys, toml_servers);

            let output = toml::to_string_pretty(&toml_val)
                .map_err(|e| format!("Failed to serialize TOML: {}", e))?;
            std::fs::write(&path, output)
                .map_err(|e| format!("Failed to write config: {}", e))?;
        }
        "json-opencode" => {
            let mut root: serde_json::Value = if path.exists() {
                let content = std::fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read config: {}", e))?;
                serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse config: {}", e))?
            } else {
                serde_json::json!({})
            };

            let converted = convert_servers_to_opencode(&request.servers);
            let target = ensure_json_path(&mut root, &resolved_key);
            *target = converted;

            let output = serde_json::to_string_pretty(&root)
                .map_err(|e| format!("Failed to serialize: {}", e))?;
            std::fs::write(&path, output)
                .map_err(|e| format!("Failed to write config: {}", e))?;
        }
        _ => {
            // JSON (default)
            let mut root: serde_json::Value = if path.exists() {
                let content = std::fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read config: {}", e))?;
                serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse config: {}", e))?
            } else {
                serde_json::json!({})
            };

            let target = ensure_json_path(&mut root, &resolved_key);
            *target = normalize_mcp_servers(request.servers);

            let output = serde_json::to_string_pretty(&root)
                .map_err(|e| format!("Failed to serialize config: {}", e))?;
            std::fs::write(&path, output)
                .map_err(|e| format!("Failed to write config: {}", e))?;
        }
    }

    append_entry(
        "config_write",
        None,
        None,
        "Updated MCP servers via structured editor",
        Some(&request.config_path),
    );
    Ok(())
}

#[tauri::command]
pub fn write_raw_config(config_path: String, content: String) -> Result<(), String> {
    // Validate JSON before writing
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let path = expand_tilde(&config_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    std::fs::write(&path, &content).map_err(|e| format!("Failed to write config: {}", e))?;

    append_entry(
        "config_write_raw",
        None,
        None,
        "Updated config via raw editor",
        Some(&config_path),
    );
    Ok(())
}

#[tauri::command]
pub fn create_backup(config_path: String, client_id: String) -> Result<String, String> {
    let source = expand_tilde(&config_path);
    if !source.exists() {
        return Err("Config file does not exist".to_string());
    }

    let dir = backup_dir(&client_id)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create backup dir: {}", e))?;

    let now = chrono::Local::now();
    let filename = format!("{}.json", now.format("%Y-%m-%dT%H-%M-%S"));
    let dest = dir.join(&filename);

    std::fs::copy(&source, &dest).map_err(|e| format!("Failed to copy backup: {}", e))?;

    append_entry(
        "backup_create",
        Some(&client_id),
        None,
        &format!("Created backup {}", &filename),
        Some(&config_path),
    );

    Ok(filename)
}

#[tauri::command]
pub fn list_backups(client_id: String) -> Result<Vec<BackupEntry>, String> {
    let dir = backup_dir(&client_id)?;
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut entries: Vec<BackupEntry> = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read backup dir: {}", e))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "json")
                .unwrap_or(false)
        })
        .filter_map(|e| {
            let filename = e.file_name().to_string_lossy().to_string();
            let meta = e.metadata().ok()?;
            // Parse timestamp from filename: 2025-01-15T14-30-00.json
            let stem = filename.strip_suffix(".json")?;
            let timestamp = stem.replace('T', " ").replace('-', ":");
            // Fix: first two colons in date part should be dashes
            let parts: Vec<&str> = timestamp.splitn(2, ' ').collect();
            let timestamp = if parts.len() == 2 {
                let date = parts[0].replacen(':', "-", 2);
                format!("{} {}", date, parts[1])
            } else {
                timestamp
            };
            Some(BackupEntry {
                filename,
                timestamp,
                size_bytes: meta.len(),
            })
        })
        .collect();

    entries.sort_by(|a, b| b.filename.cmp(&a.filename));
    Ok(entries)
}

#[tauri::command]
pub fn restore_backup(
    client_id: String,
    filename: String,
    config_path: String,
) -> Result<(), String> {
    let config = expand_tilde(&config_path);

    // Auto-backup current state first
    if config.exists() {
        create_backup(config_path.clone(), client_id.clone())?;
    }

    let dir = backup_dir(&client_id)?;
    let backup_file = dir.join(&filename);
    if !backup_file.exists() {
        return Err("Backup file not found".to_string());
    }

    let content = std::fs::read_to_string(&backup_file)
        .map_err(|e| format!("Failed to read backup: {}", e))?;

    if let Some(parent) = config.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    std::fs::write(&config, content).map_err(|e| format!("Failed to restore config: {}", e))?;

    append_entry(
        "backup_restore",
        Some(&client_id),
        None,
        &format!("Restored backup {}", &filename),
        Some(&config_path),
    );
    Ok(())
}

#[tauri::command]
pub fn delete_backup(client_id: String, filename: String) -> Result<(), String> {
    let dir = backup_dir(&client_id)?;
    let file = dir.join(&filename);
    if file.exists() {
        std::fs::remove_file(&file).map_err(|e| format!("Failed to delete backup: {}", e))?;
        append_entry(
            "backup_delete",
            Some(&client_id),
            None,
            &format!("Deleted backup {}", &filename),
            None,
        );
    }
    Ok(())
}

#[tauri::command]
pub fn read_backup(client_id: String, filename: String) -> Result<String, String> {
    let dir = backup_dir(&client_id)?;
    let file = dir.join(&filename);
    std::fs::read_to_string(&file).map_err(|e| format!("Failed to read backup: {}", e))
}

#[tauri::command]
pub fn validate_config(content: String, format: String) -> Result<(), String> {
    match format.as_str() {
        "toml" => {
            toml::from_str::<toml::Value>(&content)
                .map_err(|e| format!("TOML error: {}", e))?;
            Ok(())
        }
        _ => {
            serde_json::from_str::<serde_json::Value>(&content)
                .map_err(|e| format!("JSON error: {}", e))?;
            Ok(())
        }
    }
}

#[tauri::command]
pub fn create_default_config(
    config_path: String,
    config_key: String,
    config_format: String,
) -> Result<String, String> {
    let path = expand_tilde(&config_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let resolved_key = expand_config_key(&config_key);

    let content = match config_format.as_str() {
        "toml" => {
            let mut root = toml::Value::Table(toml::map::Map::new());
            let keys: Vec<&str> = resolved_key.split('.').collect();
            set_toml_path(&mut root, &keys, toml::Value::Table(toml::map::Map::new()));
            toml::to_string_pretty(&root)
                .map_err(|e| format!("Failed to serialize TOML: {}", e))?
        }
        _ => {
            let mut root = serde_json::json!({});
            let _ = ensure_json_path(&mut root, &resolved_key);
            serde_json::to_string_pretty(&root)
                .map_err(|e| format!("Failed to serialize: {}", e))?
        }
    };

    std::fs::write(&path, &content).map_err(|e| format!("Failed to write config: {}", e))?;

    append_entry(
        "config_create",
        None,
        None,
        "Created default config",
        Some(&config_path),
    );

    Ok(content)
}
