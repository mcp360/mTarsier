use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use super::utils::expand_tilde;

// ─── Registry search via skills.sh API ───────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillSearchResult {
    pub id: String,
    pub name: String,
    pub installs: Option<u64>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiSearchResponse {
    skills: Vec<SkillSearchResult>,
}

#[tauri::command]
pub fn skills_search(query: String) -> Result<Vec<SkillSearchResult>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }
    let url = format!(
        "https://skills.sh/api/search?q={}&limit=20",
        query.trim().replace(' ', "+")
    );
    // Use curl — available on macOS/Linux by default, no extra deps needed
    let output = std::process::Command::new("curl")
        .args(["-sf", "-H", "Accept: application/json", &url])
        .output()
        .map_err(|e| format!("curl not found: {e}"))?;
    if !output.status.success() {
        return Err("Search request failed".to_string());
    }
    let resp: ApiSearchResponse = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse response: {e}"))?;
    Ok(resp.skills)
}

#[tauri::command]
pub fn skills_install(source: String) -> Result<(), String> {
    let output = std::process::Command::new("npx")
        .args(["--yes", "skills", "add", &source, "-g", "-y"])
        .output()
        .map_err(|e| format!("npx not found — make sure Node.js is installed: {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.trim().to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    #[cfg(target_os = "macos")]
    {
        // -R reveals the item in Finder (selects it in its parent folder)
        // without visually resolving through symlinks to a different location
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillEntry {
    pub name: String,
    pub description: String,
    pub path: String,
    pub raw_content: String,
}

fn parse_frontmatter(content: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return map;
    }
    let after_open = &trimmed[3..];
    if let Some(close_pos) = after_open.find("\n---") {
        let fm = &after_open[..close_pos];
        for line in fm.lines() {
            if let Some(colon) = line.find(':') {
                let key = line[..colon].trim().to_string();
                let val = line[colon + 1..]
                    .trim()
                    .trim_matches('"')
                    .to_string();
                if !key.is_empty() {
                    map.insert(key, val);
                }
            }
        }
    }
    map
}

#[tauri::command]
pub fn list_skills(skills_path: String) -> Result<Vec<SkillEntry>, String> {
    let path = expand_tilde(&skills_path);
    if !path.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut skills = vec![];
    for entry in entries.flatten() {
        let dir_path = entry.path();
        if !dir_path.is_dir() {
            continue;
        }
        let skill_file = dir_path.join("SKILL.md");
        if !skill_file.exists() {
            continue;
        }
        let raw = std::fs::read_to_string(&skill_file).map_err(|e| e.to_string())?;
        let fm = parse_frontmatter(&raw);
        let name = fm.get("name").cloned().unwrap_or_else(|| {
            dir_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string()
        });
        let description = fm.get("description").cloned().unwrap_or_default();
        skills.push(SkillEntry {
            name,
            description,
            path: dir_path.to_string_lossy().to_string(),
            raw_content: raw,
        });
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(skills)
}

#[tauri::command]
pub fn write_skill(
    skills_path: String,
    skill_name: String,
    content: String,
) -> Result<String, String> {
    let base = expand_tilde(&skills_path);
    let dir_name: String = skill_name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let skill_dir = base.join(&dir_name);
    std::fs::create_dir_all(&skill_dir).map_err(|e| e.to_string())?;
    let skill_file = skill_dir.join("SKILL.md");
    std::fs::write(&skill_file, &content).map_err(|e| e.to_string())?;
    Ok(skill_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_skill(skill_path: String) -> Result<(), String> {
    let path = PathBuf::from(&skill_path);
    if !path.exists() {
        return Ok(());
    }
    std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_skill(skill_path: String) -> Result<String, String> {
    let path = PathBuf::from(&skill_path).join("SKILL.md");
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}
