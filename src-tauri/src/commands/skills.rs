use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;

use super::utils::expand_tilde;

// ─── ANSI stripping ───────────────────────────────────────────────────────────

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // consume everything until a letter (the final byte of the escape)
            for nc in chars.by_ref() {
                if nc.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

// ─── Registry search ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct SkillSearchResult {
    pub source: String,
    pub name: String,
    pub installs: u64,
    pub url: String,
}

fn parse_search_output(text: &str) -> Vec<SkillSearchResult> {
    let mut results = vec![];
    let lines: Vec<&str> = text.lines().collect();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        // Match lines like: "owner/repo@skill-name  N installs"
        if line.contains('@') && line.contains('/') && line.contains("install") {
            if let Some(inst_pos) = line.find("install") {
                let before = line[..inst_pos].trim();
                // split on last whitespace to get source and count
                if let Some(sp) = before.rfind(|c: char| c.is_whitespace()) {
                    let source = before[..sp].trim().to_string();
                    let count = before[sp + 1..].trim().parse::<u64>().unwrap_or(0);
                    if source.contains('@') && source.contains('/') {
                        let name = source
                            .split('@')
                            .last()
                            .unwrap_or(&source)
                            .to_string();
                        // URL on next line starting with └ or http
                        let mut url = String::new();
                        if i + 1 < lines.len() {
                            let next = lines[i + 1].trim();
                            if next.starts_with('\u{2514}') || next.starts_with("http") {
                                url = next
                                    .trim_start_matches('\u{2514}')
                                    .trim()
                                    .to_string();
                                i += 1;
                            }
                        }
                        results.push(SkillSearchResult { source, name, installs: count, url });
                    }
                }
            }
        }
        i += 1;
    }
    results
}

#[tauri::command]
pub fn skills_search(query: String) -> Result<Vec<SkillSearchResult>, String> {
    let mut child = std::process::Command::new("npx")
        .args(["--yes", "skills", "find", &query])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("npx not found — make sure Node.js is installed: {e}"))?;

    // Send ESC immediately to dismiss the interactive TUI after results print
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(b"\x1b");
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let raw = String::from_utf8_lossy(&output.stdout).to_string();
    let text = strip_ansi(&raw);
    Ok(parse_search_output(&text))
}

#[tauri::command]
pub fn skills_install(source: String) -> Result<(), String> {
    let output = std::process::Command::new("npx")
        .args(["--yes", "skills", "add", &source, "-g", "-y"])
        .output()
        .map_err(|e| format!("npx not found — make sure Node.js is installed: {e}"))?;

    if !output.status.success() {
        let err = strip_ansi(&String::from_utf8_lossy(&output.stderr));
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
