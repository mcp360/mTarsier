use std::path::PathBuf;

pub fn expand_tilde(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}

pub fn navigate_json_key<'a>(
    value: &'a serde_json::Value,
    key: &str,
) -> Option<&'a serde_json::Value> {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = value;
    for part in parts {
        current = current.get(part)?;
    }
    Some(current)
}

pub fn ensure_json_path<'a>(
    value: &'a mut serde_json::Value,
    key: &str,
) -> &'a mut serde_json::Value {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = value;
    for part in parts {
        if !current.is_object() {
            *current = serde_json::json!({});
        }
        if !current.as_object().unwrap().contains_key(part) {
            current
                .as_object_mut()
                .unwrap()
                .insert(part.to_string(), serde_json::json!({}));
        }
        current = current.get_mut(part).unwrap();
    }
    current
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

pub fn expand_config_key(key: &str) -> String {
    if key.contains("{HOME}") {
        if let Some(home) = dirs::home_dir() {
            return key.replace("{HOME}", &home.to_string_lossy());
        }
    }
    key.to_string()
}

pub fn backup_dir(client_id: &str) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let dir = home
        .join(".mtarsier")
        .join("backups")
        .join(client_id);
    Ok(dir)
}
