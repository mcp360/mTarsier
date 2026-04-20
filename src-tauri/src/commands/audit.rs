use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

/// Global flag — when false, `append_entry` is a no-op.
pub static AUDIT_ENABLED: AtomicBool = AtomicBool::new(true);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: String,
    pub action: String,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub detail: String,
    pub config_path: Option<String>,
}

fn audit_file() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let dir = home.join(".mtarsier");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create audit dir: {}", e))?;
    Ok(dir.join("audit.json"))
}

fn read_entries() -> Result<Vec<AuditEntry>, String> {
    let path = audit_file()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read audit log: {}", e))?;
    if content.trim().is_empty() {
        return Ok(vec![]);
    }
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse audit log: {}", e))
}

fn write_entries(entries: &[AuditEntry]) -> Result<(), String> {
    let path = audit_file()?;
    let content = serde_json::to_string_pretty(entries)
        .map_err(|e| format!("Failed to serialize audit log: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write audit log: {}", e))
}

pub fn append_entry(
    action: &str,
    client_id: Option<&str>,
    client_name: Option<&str>,
    detail: &str,
    config_path: Option<&str>,
) {
    if !AUDIT_ENABLED.load(Ordering::Relaxed) {
        return;
    }
    let entry = AuditEntry {
        id: uuid_v4(),
        timestamp: chrono::Local::now().to_rfc3339(),
        action: action.to_string(),
        client_id: client_id.map(String::from),
        client_name: client_name.map(String::from),
        detail: detail.to_string(),
        config_path: config_path.map(String::from),
    };
    if let Ok(mut entries) = read_entries() {
        entries.push(entry);
        let _ = write_entries(&entries);
    }
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let random: u64 = (nanos as u64) ^ (std::process::id() as u64).wrapping_mul(2654435761);
    format!("{:016x}-{:08x}", nanos, random)
}

#[tauri::command]
pub fn get_audit_logs() -> Result<Vec<AuditEntry>, String> {
    let mut entries = read_entries()?;
    entries.reverse(); // newest first
    Ok(entries)
}

#[tauri::command]
pub fn clear_audit_logs() -> Result<(), String> {
    write_entries(&[])
}

#[tauri::command]
pub fn export_audit_logs() -> Result<String, String> {
    let entries = read_entries()?;
    serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to export audit logs: {}", e))
}

#[tauri::command]
pub fn set_audit_enabled(enabled: bool) {
    AUDIT_ENABLED.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
pub fn log_audit_entry(
    action: String,
    client_id: Option<String>,
    client_name: Option<String>,
    detail: String,
    config_path: Option<String>,
) -> Result<(), String> {
    append_entry(
        &action,
        client_id.as_deref(),
        client_name.as_deref(),
        &detail,
        config_path.as_deref(),
    );
    Ok(())
}
