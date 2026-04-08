use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::utils::{expand_tilde, silent_command};

const SKILLS_SEARCH_ENDPOINT: &str = "https://skills.sh/api/search";
const MAX_SEARCH_QUERY_LEN: usize = 120;

fn canonical_home_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    std::fs::canonicalize(home).map_err(|e| format!("Failed to resolve home directory: {e}"))
}

fn has_parent_component(path: &Path) -> bool {
    path.components().any(|c| matches!(c, Component::ParentDir))
}

fn nearest_existing_ancestor(path: &Path) -> Option<PathBuf> {
    let mut current = path.to_path_buf();
    loop {
        if current.exists() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

fn validate_skills_root_path(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    if has_parent_component(path) {
        return Err("Path contains disallowed traversal segments".to_string());
    }

    let base_name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
    if !base_name.eq_ignore_ascii_case("skills") {
        return Err("Path must point to a skills directory".to_string());
    }

    let canonical_home = canonical_home_dir()?;
    let ancestor = nearest_existing_ancestor(path)
        .ok_or_else(|| "Path has no existing ancestor to validate".to_string())?;
    let canonical_ancestor = std::fs::canonicalize(&ancestor)
        .map_err(|e| format!("Failed to resolve path ancestor: {e}"))?;

    if !canonical_ancestor.starts_with(&canonical_home) {
        return Err("Path must be inside your home directory".to_string());
    }

    // Return canonical ancestor joined with the remaining (not-yet-existing) suffix,
    // so any symlinks in the existing portion are resolved before use.
    let suffix = path.strip_prefix(&ancestor).unwrap_or(std::path::Path::new(""));
    Ok(canonical_ancestor.join(suffix))
}

fn expand_and_validate_skills_root(raw_path: &str) -> Result<PathBuf, String> {
    let expanded = expand_tilde(raw_path);
    validate_skills_root_path(&expanded)
}

fn validate_skill_dir_path(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() {
        return Err("Skill path must be absolute".to_string());
    }
    if has_parent_component(path) {
        return Err("Skill path contains disallowed traversal segments".to_string());
    }
    if !path.exists() {
        return Err("Skill path does not exist".to_string());
    }

    let canonical = std::fs::canonicalize(path).map_err(|e| format!("Failed to resolve skill path: {e}"))?;
    if !canonical.is_dir() {
        return Err("Skill path is not a directory".to_string());
    }

    let canonical_home = canonical_home_dir()?;
    if !canonical.starts_with(&canonical_home) {
        return Err("Skill path must be inside your home directory".to_string());
    }

    let parent = canonical
        .parent()
        .ok_or_else(|| "Skill path has no parent directory".to_string())?;
    let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or_default();
    if !parent_name.eq_ignore_ascii_case("skills") {
        return Err("Skill path must be a direct child of a skills directory".to_string());
    }

    let skill_md = canonical.join("SKILL.md");
    if !skill_md.is_file() {
        return Err("Skill directory is missing SKILL.md".to_string());
    }

    Ok(canonical)
}

fn validate_skill_delete_path(raw_path: &str) -> Result<Option<PathBuf>, String> {
    let expanded = expand_tilde(raw_path);
    if !expanded.is_absolute() {
        return Err("Skill path must be absolute".to_string());
    }
    if has_parent_component(&expanded) {
        return Err("Skill path contains disallowed traversal segments".to_string());
    }

    let parent = expanded
        .parent()
        .ok_or_else(|| "Skill path has no parent directory".to_string())?;
    validate_skills_root_path(parent)?;

    if !expanded.exists() {
        return Ok(None);
    }

    let canonical = validate_skill_dir_path(&expanded)?;
    Ok(Some(canonical))
}

fn is_valid_github_identifier(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 100
        && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !s.starts_with('-')
        && !s.starts_with('.')
}

/// Parse GitHub source into owner/repo format
/// Input: "github/awesome-copilot/git-commit" or "anthropics/anthropic-quickstarts"
/// Output: ("github", "awesome-copilot") or ("anthropics", "anthropic-quickstarts")
fn parse_github_repo(source: &str) -> Result<(String, String), String> {
    let source = source.trim();

    // Handle full GitHub URLs
    if source.starts_with("https://github.com/") || source.starts_with("http://github.com/") {
        let path = source
            .trim_start_matches("https://github.com/")
            .trim_start_matches("http://github.com/")
            .trim_end_matches(".git");
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        if parts.len() < 2 {
            return Err("Invalid GitHub URL format".to_string());
        }
        let owner = parts[0];
        let repo = parts[1];
        if !is_valid_github_identifier(owner) {
            return Err(format!("Invalid GitHub owner name: '{}'", owner));
        }
        if !is_valid_github_identifier(repo) {
            return Err(format!("Invalid GitHub repository name: '{}'", repo));
        }
        return Ok((owner.to_string(), repo.to_string()));
    }

    // Handle owner/repo or owner/repo/path format
    let parts: Vec<&str> = source.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() < 2 {
        return Err("Source must be in format: owner/repo or owner/repo/path".to_string());
    }

    let owner = parts[0];
    let repo = parts[1];
    if !is_valid_github_identifier(owner) {
        return Err(format!("Invalid GitHub owner name: '{}'", owner));
    }
    if !is_valid_github_identifier(repo) {
        return Err(format!("Invalid GitHub repository name: '{}'", repo));
    }

    Ok((owner.to_string(), repo.to_string()))
}

/// Download and extract GitHub repository tarball
fn download_github_tarball(owner: &str, repo: &str, extract_to: &Path) -> Result<(), String> {
    let tarball_url = format!("https://api.github.com/repos/{}/{}/tarball/main", owner, repo);

    // Download tarball using curl
    let download_output = silent_command("curl")
        .arg("-sfL")
        .arg("--proto")
        .arg("=https")
        .arg("--tlsv1.2")
        .arg("--connect-timeout")
        .arg("10")
        .arg("--max-time")
        .arg("30")
        .arg(&tarball_url)
        .output()
        .map_err(|e| format!("curl not found: {e}"))?;

    if !download_output.status.success() {
        // Try 'master' branch as fallback
        let master_url = format!("https://api.github.com/repos/{}/{}/tarball/master", owner, repo);
        let master_output = silent_command("curl")
            .arg("-sfL")
            .arg("--proto")
            .arg("=https")
            .arg("--tlsv1.2")
            .arg("--connect-timeout")
            .arg("10")
            .arg("--max-time")
            .arg("30")
            .arg(&master_url)
            .output()
            .map_err(|e| format!("curl not found: {e}"))?;

        if !master_output.status.success() {
            let stderr = String::from_utf8_lossy(&download_output.stderr);
            return Err(format!("Failed to download repository {}/{}: {}", owner, repo, stderr));
        }

        // Extract master tarball
        return extract_tarball(&master_output.stdout, extract_to, owner, repo);
    }

    // Extract main tarball
    extract_tarball(&download_output.stdout, extract_to, owner, repo)
}

/// Recursively remove symlinks from a directory (cross-platform zip-slip mitigation)
fn remove_symlinks_recursive(dir: &Path) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        match entry.file_type() {
            Ok(ft) if ft.is_symlink() => {
                let _ = std::fs::remove_file(&path);
            }
            Ok(ft) if ft.is_dir() => {
                remove_symlinks_recursive(&path);
            }
            _ => {}
        }
    }
}

/// Extract tarball data to target directory
fn extract_tarball(tarball_data: &[u8], extract_to: &Path, owner: &str, repo: &str) -> Result<(), String> {
    std::fs::create_dir_all(extract_to)
        .map_err(|e| format!("Failed to create extraction directory: {e}"))?;

    // Create temp file for tarball
    let temp_tarball = extract_to.join("repo.tar.gz");
    std::fs::write(&temp_tarball, tarball_data)
        .map_err(|e| format!("Failed to write tarball: {e}"))?;

    // Extract using tar
    let extract_status = silent_command("tar")
        .arg("-xzf")
        .arg(&temp_tarball)
        .arg("-C")
        .arg(extract_to)
        .arg("--strip-components=1")
        .output()
        .map_err(|e| format!("tar not found: {e}"))?;

    // Cleanup temp tarball
    let _ = std::fs::remove_file(&temp_tarball);

    if !extract_status.status.success() {
        let stderr = String::from_utf8_lossy(&extract_status.stderr);
        return Err(format!("Failed to extract tarball for {}/{}: {}", owner, repo, stderr));
    }

    // Remove any symlinks from the extracted directory to prevent zip-slip attacks
    remove_symlinks_recursive(extract_to);

    Ok(())
}

/// Download skill from GitHub repository using tarball API (faster than git clone)
fn download_skill_via_github(source: &str, install_home: &PathBuf) -> Result<(), String> {
    let (owner, repo) = parse_github_repo(source)?;

    // Create extraction directory
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System clock error: {e}"))?
        .as_millis();
    let extract_dir = install_home.join(format!("extract-{}", now));

    // Download and extract repository
    download_github_tarball(&owner, &repo, &extract_dir)?;

    // Create .agents/skills directory
    let agents_skills = install_home.join(".agents/skills");
    std::fs::create_dir_all(&agents_skills)
        .map_err(|e| format!("Failed to create skills directory: {e}"))?;

    // Find and copy skills from extracted repo
    let skills_found = find_and_copy_skills(&extract_dir, &agents_skills)?;

    // Cleanup extraction directory
    let _ = std::fs::remove_dir_all(&extract_dir);

    if skills_found == 0 {
        return Err("No valid skills found. Skills require a SKILL.md file.".to_string());
    }

    Ok(())
}

const MAX_SKILL_SEARCH_DEPTH: usize = 10;

/// Recursively find skill directories (containing SKILL.md) and copy them
fn find_and_copy_skills(source_dir: &Path, dest_dir: &Path) -> Result<usize, String> {
    find_and_copy_skills_inner(source_dir, dest_dir, 0)
}

fn find_and_copy_skills_inner(source_dir: &Path, dest_dir: &Path, depth: usize) -> Result<usize, String> {
    if depth > MAX_SKILL_SEARCH_DEPTH {
        return Err("Skill directory nesting too deep".to_string());
    }

    if !source_dir.exists() {
        return Ok(0);
    }

    let mut skills_found = 0;

    // Check if this directory itself is a skill
    let skill_md = source_dir.join("SKILL.md");
    if skill_md.is_file() {
        let skill_name = source_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid skill directory name".to_string())?;

        let target = dest_dir.join(skill_name);

        // Remove existing if present
        if target.exists() {
            std::fs::remove_dir_all(&target)
                .map_err(|e| format!("Failed to remove existing skill '{}': {}", skill_name, e))?;
        }

        copy_dir_recursive(source_dir, &target)
            .map_err(|e| format!("Failed to copy skill '{}': {}", skill_name, e))?;

        skills_found += 1;
        return Ok(skills_found);
    }

    // Otherwise, search subdirectories
    let entries = match std::fs::read_dir(source_dir) {
        Ok(e) => e,
        Err(_) => return Ok(0),
    };

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        if path.is_dir() {
            // Skip hidden directories and common non-skill directories
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.') || name == "node_modules" || name == "dist" || name == "build" {
                    continue;
                }
            }
            // Recursively search subdirectories
            skills_found += find_and_copy_skills_inner(&path, dest_dir, depth + 1)?;
        }
    }

    Ok(skills_found)
}

fn parse_source_parts(source: &str) -> (Option<String>, Option<String>) {
    let parts: Vec<&str> = source.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() >= 3 {
        let base_source = format!("{}/{}", parts[0], parts[1]);
        let requested_skill = parts[2..].join("/");
        (Some(base_source), Some(requested_skill))
    } else {
        (None, None)
    }
}

fn normalize_skill_name(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .flat_map(|c| c.to_lowercase())
        .collect()
}

fn create_install_sandbox_home() -> Result<PathBuf, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System clock error: {e}"))?
        .as_millis();
    let temp_root = dirs::cache_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("mtarsier")
        .join("skills")
        .join("tmp");
    std::fs::create_dir_all(&temp_root)
        .map_err(|e| format!("Failed to create temp root directory: {e}"))?;
    let temp_home = temp_root.join(format!(
        "mtarsier-skills-install-{}-{}",
        std::process::id(),
        now
    ));
    std::fs::create_dir_all(&temp_home)
        .map_err(|e| format!("Failed to create temp install directory: {e}"))?;
    Ok(temp_home)
}

struct TempDirGuard {
    path: PathBuf,
}

impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn sanitize_search_query(raw_query: &str) -> Result<String, String> {
    let trimmed = raw_query.trim();
    if trimmed.is_empty() {
        return Err("Search query cannot be empty".to_string());
    }
    if trimmed.len() > MAX_SEARCH_QUERY_LEN {
        return Err(format!(
            "Search query too long (max {} characters)",
            MAX_SEARCH_QUERY_LEN
        ));
    }
    if trimmed.chars().any(|c| c.is_control()) {
        return Err("Search query contains invalid control characters".to_string());
    }
    Ok(trimmed.to_string())
}

// ─── Registry search via skills.sh API ───────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillSearchResult {
    pub id: String,
    pub name: String,
    pub installs: Option<u64>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct ApiSearchResponse {
    query: String,
    #[serde(rename = "searchType")]
    search_type: String,
    skills: Vec<SkillSearchResult>,
    count: u64,
    duration_ms: u64,
}

#[tauri::command]
pub fn skills_search(query: String) -> Result<Vec<SkillSearchResult>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }
    let sanitized_query = sanitize_search_query(&query)?;
    let query_param = format!("q={}", sanitized_query);

    // Use curl with a fixed endpoint and URL-encoded query args.
    let output = silent_command("curl")
        .arg("-sf")
        .arg("--proto")
        .arg("=https")
        .arg("--tlsv1.2")
        .arg("--connect-timeout")
        .arg("5")
        .arg("--max-time")
        .arg("10")
        .arg("-H")
        .arg("Accept: application/json")
        .arg("--get")
        .arg("--data-urlencode")
        .arg(&query_param)
        .arg("--data-urlencode")
        .arg("limit=20")
        .arg(SKILLS_SEARCH_ENDPOINT)
        .output()
        .map_err(|e| format!("curl not found: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.is_empty() {
            return Err("Search request failed".to_string());
        }
        return Err(format!("Search request failed: {}", stderr.trim()));
    }
    let resp: ApiSearchResponse = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse response: {e}"))?;
    Ok(resp.skills)
}

fn choose_best_skill_match(
    skill_paths: Vec<PathBuf>,
    requested_norm: &str,
) -> Vec<PathBuf> {
    if requested_norm.is_empty() {
        return skill_paths;
    }

    let mut exact = Vec::new();
    for path in &skill_paths {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        let candidate_norm = normalize_skill_name(name);
        if candidate_norm == requested_norm {
            exact.push(path.clone());
        }
    }
    if !exact.is_empty() {
        return exact;
    }

    let mut fuzzy: Vec<(usize, PathBuf)> = Vec::new();
    for path in &skill_paths {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        let candidate_norm = normalize_skill_name(name);
        if candidate_norm.contains(requested_norm) || requested_norm.contains(&candidate_norm) {
            let delta = candidate_norm.len().abs_diff(requested_norm.len());
            fuzzy.push((delta, path.clone()));
        }
    }

    if fuzzy.is_empty() {
        return Vec::new();
    }

    fuzzy.sort_by_key(|(delta, _)| *delta);
    vec![fuzzy.remove(0).1]
}

pub fn skills_install_blocking(
    source: String,
    target_paths: Vec<String>,
    requested_name: Option<String>,
) -> Result<String, String> {
    if target_paths.is_empty() {
        return Err("No target client paths selected".to_string());
    }

    let mut validated_targets: Vec<(String, PathBuf)> = Vec::with_capacity(target_paths.len());
    let mut seen_targets: HashSet<String> = HashSet::new();
    for raw_path in target_paths {
        let validated = expand_and_validate_skills_root(&raw_path)
            .map_err(|e| format!("Invalid target path '{}': {}", raw_path, e))?;
        let dedupe_key = validated.to_string_lossy().to_string();
        if seen_targets.insert(dedupe_key) {
            validated_targets.push((raw_path, validated));
        }
    }

    let install_home = create_install_sandbox_home()?;
    let _sandbox_guard = TempDirGuard {
        path: install_home.clone(),
    };
    let agents_skills = install_home.join(".agents/skills");
    let (fallback_source, requested_skill_slug) = parse_source_parts(&source);
    let requested_from_name = requested_name
        .as_deref()
        .map(normalize_skill_name)
        .filter(|s| !s.is_empty());

    // Download skill using GitHub tarball API (faster than npx)
    let download_result = download_skill_via_github(&source, &install_home);

    if download_result.is_err() {
        // Try fallback to base source if specific skill path failed
        if let Some(base_source) = fallback_source.as_ref() {
            if base_source != &source {
                let fallback_result = download_skill_via_github(base_source, &install_home);
                if fallback_result.is_err() {
                    return Err(download_result.unwrap_err());
                }
            } else {
                return Err(download_result.unwrap_err());
            }
        } else {
            return Err(download_result.unwrap_err());
        }
    }

    // Verify skills were downloaded
    if !agents_skills.exists() {
        return Err("No skills were downloaded".to_string());
    }

    let mut skills_to_copy: Vec<PathBuf> = std::fs::read_dir(&agents_skills)
        .map_err(|e| format!("Failed to read installed skills: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.path())
        .collect();

    if skills_to_copy.is_empty() {
        return Err(format!(
            "No skills found matching '{}'. Try installing with a different source.",
            source
        ));
    }

    // Keep only the intended skill for Discover installs.
    let requested_norm = requested_skill_slug
        .as_deref()
        .map(normalize_skill_name)
        .filter(|s| !s.is_empty())
        .or(requested_from_name);
    if let Some(requested_norm) = requested_norm.as_deref() {
        skills_to_copy = choose_best_skill_match(skills_to_copy, requested_norm);
        if skills_to_copy.is_empty() {
            let fallback_hint = fallback_source.as_deref().unwrap_or(&source);
            return Err(format!(
                "Installed source but could not locate requested skill '{}'. Try installing '{}' instead.",
                requested_name
                    .as_deref()
                    .or(requested_skill_slug.as_deref())
                    .unwrap_or(requested_norm),
                fallback_hint
            ));
        }
    }

    // Step 4: Copy selected skills to target client directories.
    let mut prepared_skills: Vec<(String, PathBuf)> = Vec::new();
    let mut skill_names = Vec::new();

    for skill_dir in &skills_to_copy {
        let skill_md = skill_dir.join("SKILL.md");
        if !skill_md.exists() {
            continue; // Skip directories without SKILL.md
        }
        let skill_name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Installed skill has invalid directory name".to_string())?
            .to_string();
        skill_names.push(skill_name.clone());
        prepared_skills.push((skill_name, skill_dir.clone()));
    }

    // Copy skills to all target directories in parallel.
    let prepared_skills = std::sync::Arc::new(prepared_skills);
    let handles: Vec<_> = validated_targets
        .into_iter()
        .map(|(target_path, target_base)| {
            let prepared_skills = std::sync::Arc::clone(&prepared_skills);
            std::thread::spawn(move || -> Result<(), String> {
                if !target_base.exists() {
                    std::fs::create_dir_all(&target_base)
                        .map_err(|e| format!("Failed to create {}: {}", target_path, e))?;
                }
                for (skill_name, skill_dir) in prepared_skills.as_ref() {
                    let target_skill_dir = target_base.join(skill_name);
                    if target_skill_dir.exists() {
                        std::fs::remove_dir_all(&target_skill_dir).map_err(|e| {
                            format!("Failed to remove existing skill '{}' for {}: {}", skill_name, target_path, e)
                        })?;
                    }
                    copy_dir_recursive(skill_dir, &target_skill_dir).map_err(|e| {
                        format!("Failed to copy skill '{}' to {}: {}", skill_name, target_path, e)
                    })?;
                }
                Ok(())
            })
        })
        .collect();

    for handle in handles {
        handle.join().map_err(|_| "Install thread panicked".to_string())??;
    }

    // Return summary of what was installed
    if skill_names.is_empty() {
        Err("No valid skills found to install".to_string())
    } else if skill_names.len() == 1 {
        Ok(skill_names[0].clone())
    } else {
        Ok(format!("{} skills", skill_names.len()))
    }
}

#[tauri::command]
/// Try installing via `npx skills add` for a list of agent IDs.
/// Returns Ok(installed_count) or Err if npx is unavailable / fails.
pub fn skills_install_via_npx(
    source: &str,
    agent_ids: &[String],
    requested_name: Option<&str>,
) -> Result<usize, String> {
    if agent_ids.is_empty() {
        return Ok(0);
    }

    // Validate source format: owner/repo or owner/repo/skill
    let valid_source = source.split('/').all(|part| {
        !part.is_empty() && part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
    }) && source.matches('/').count() >= 1 && source.matches('/').count() <= 2;
    if !valid_source {
        return Err(format!("Invalid skill source format: {}", source));
    }

    // Check npx is available
    let npx_check = std::process::Command::new("npx")
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();
    if npx_check.is_err() || !npx_check.unwrap().success() {
        return Err("npx not found — Node.js is required to install for this client".to_string());
    }

    let mut cmd = std::process::Command::new("npx");
    cmd.arg("skills").arg("add").arg(source);

    for id in agent_ids {
        // Validate agent ID: alphanumeric, hyphens only
        if id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            cmd.arg("--agent").arg(id);
        }
    }

    if let Some(name) = requested_name {
        let normalized = normalize_skill_name(name);
        if !normalized.is_empty() {
            cmd.arg("--skill").arg(normalized);
        }
    }

    cmd.arg("--yes");

    let output = cmd.output().map_err(|e| format!("Failed to run npx skills: {e}"))?;

    if output.status.success() {
        Ok(agent_ids.len())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("npx skills add failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn skills_install(
    source: String,
    target_paths: Vec<String>,
    npx_agent_ids: Vec<String>,
    npx_fallback_paths: Vec<String>,
    requested_name: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        // Collect all paths that need file-copy (non-npx clients + custom paths).
        let mut file_copy_paths = target_paths;

        // Try npx for known clients; on failure, fall back to file-copy for those clients.
        if !npx_agent_ids.is_empty() {
            if let Err(_) = skills_install_via_npx(&source, &npx_agent_ids, requested_name.as_deref()) {
                // npx failed — add their skillsPaths to file-copy queue
                file_copy_paths.extend(npx_fallback_paths);
            }
        }

        if file_copy_paths.is_empty() && npx_agent_ids.is_empty() {
            return Err("No install targets specified".to_string());
        }

        if !file_copy_paths.is_empty() {
            skills_install_blocking(source, file_copy_paths, requested_name)
        } else {
            Ok(requested_name.unwrap_or_else(|| "skill".to_string()))
        }
    })
        .await
        .map_err(|e| format!("Installation task failed: {e}"))?
}

// Helper function to recursively copy directories
fn fallback_copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            fallback_copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    {
        // Use APFS clone-aware copy first. Falls back to recursive Rust copy if unavailable.
        let status = std::process::Command::new("cp")
            .arg("-Rc")
            .arg(src)
            .arg(dst)
            .status();
        if let Ok(status) = status {
            if status.success() {
                return Ok(());
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // GNU cp is generally faster than manual recursive copies for large trees.
        let status = std::process::Command::new("cp")
            .arg("-R")
            .arg(src)
            .arg(dst)
            .status();
        if let Ok(status) = status {
            if status.success() {
                return Ok(());
            }
        }
    }

    fallback_copy_dir_recursive(src, dst)
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
    let path = expand_and_validate_skills_root(&skills_path)?;
    if !path.exists() {
        return Ok(vec![]);
    }

    let canonical_base =
        std::fs::canonicalize(&path).map_err(|e| format!("Failed to resolve skills path: {e}"))?;

    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut skills = vec![];
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };
        if !file_type.is_dir() || file_type.is_symlink() {
            continue;
        }

        let dir_path = entry.path();
        let canonical_dir = match std::fs::canonicalize(&dir_path) {
            Ok(path) => path,
            Err(_) => continue,
        };
        if canonical_dir.parent() != Some(canonical_base.as_path()) {
            continue;
        }
        let skill_file = canonical_dir.join("SKILL.md");
        if !skill_file.exists() {
            continue;
        }
        let raw = std::fs::read_to_string(&skill_file).map_err(|e| e.to_string())?;
        let fm = parse_frontmatter(&raw);
        let name = fm.get("name").cloned().unwrap_or_else(|| {
            canonical_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string()
        });
        let description = fm.get("description").cloned().unwrap_or_default();
        skills.push(SkillEntry {
            name,
            description,
            path: canonical_dir.to_string_lossy().to_string(),
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
    let base = expand_and_validate_skills_root(&skills_path)?;
    if !base.exists() {
        std::fs::create_dir_all(&base).map_err(|e| format!("Failed to create skills directory: {e}"))?;
    }

    let mut dir_name: String = skill_name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    dir_name = dir_name.trim_matches('-').to_string();
    if dir_name.is_empty() {
        return Err("Skill name must include at least one alphanumeric character".to_string());
    }

    let skill_dir = base.join(&dir_name);
    if skill_dir.parent() != Some(base.as_path()) {
        return Err("Invalid skill directory path".to_string());
    }

    std::fs::create_dir_all(&skill_dir).map_err(|e| e.to_string())?;
    let skill_file = skill_dir.join("SKILL.md");
    std::fs::write(&skill_file, &content).map_err(|e| e.to_string())?;
    Ok(skill_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_skill(skill_path: String) -> Result<(), String> {
    let Some(path) = validate_skill_delete_path(&skill_path)? else {
        return Ok(());
    };
    std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_skills_bulk(skill_paths: Vec<String>) -> Result<usize, String> {
    let mut deleted_count = 0usize;

    for skill_path in skill_paths {
        let Some(path) = validate_skill_delete_path(&skill_path)? else {
            continue;
        };
        std::fs::remove_dir_all(&path)
            .map_err(|e| format!("Failed to delete {}: {}", skill_path, e))?;
        deleted_count += 1;
    }

    Ok(deleted_count)
}

#[tauri::command]
pub fn read_skill(skill_path: String) -> Result<String, String> {
    let expanded = expand_tilde(&skill_path);
    let skill_dir = validate_skill_dir_path(&expanded)?;
    let path = skill_dir.join("SKILL.md");
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// ─── Featured / Top Picks ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct FeaturedSkill {
    pub id: String,
    pub name: String,
    pub source: String,
    pub installs: u64,
    pub description: String,
}

#[tauri::command]
pub fn get_featured_skills() -> Vec<FeaturedSkill> {
    vec![
        FeaturedSkill { id: "obra/superpowers/brainstorming".into(),                    name: "brainstorming".into(),                    source: "obra/superpowers".into(), installs: 0, description: "Structured brainstorming to explore ideas and approaches before committing to a plan.".into() },
        FeaturedSkill { id: "obra/superpowers/dispatching-parallel-agents".into(),      name: "dispatching-parallel-agents".into(),      source: "obra/superpowers".into(), installs: 0, description: "Run multiple agents in parallel to complete complex tasks faster.".into() },
        FeaturedSkill { id: "obra/superpowers/executing-plans".into(),                  name: "executing-plans".into(),                  source: "obra/superpowers".into(), installs: 0, description: "Execute a written plan step by step with discipline and verification.".into() },
        FeaturedSkill { id: "obra/superpowers/finishing-a-development-branch".into(),   name: "finishing-a-development-branch".into(),   source: "obra/superpowers".into(), installs: 0, description: "Wrap up a dev branch: clean up, write tests, update docs, open PR.".into() },
        FeaturedSkill { id: "obra/superpowers/receiving-code-review".into(),            name: "receiving-code-review".into(),            source: "obra/superpowers".into(), installs: 0, description: "Process and respond to code review feedback constructively.".into() },
        FeaturedSkill { id: "obra/superpowers/requesting-code-review".into(),           name: "requesting-code-review".into(),           source: "obra/superpowers".into(), installs: 0, description: "Prepare code for review and write a clear, useful PR description.".into() },
        FeaturedSkill { id: "obra/superpowers/subagent-driven-development".into(),      name: "subagent-driven-development".into(),      source: "obra/superpowers".into(), installs: 0, description: "Delegate subtasks to specialised subagents and synthesise results.".into() },
        FeaturedSkill { id: "obra/superpowers/systematic-debugging".into(),             name: "systematic-debugging".into(),             source: "obra/superpowers".into(), installs: 0, description: "Work through bugs methodically: reproduce, isolate, fix, verify.".into() },
        FeaturedSkill { id: "obra/superpowers/test-driven-development".into(),          name: "test-driven-development".into(),          source: "obra/superpowers".into(), installs: 0, description: "Write failing tests first, then implement until they pass.".into() },
        FeaturedSkill { id: "obra/superpowers/using-git-worktrees".into(),              name: "using-git-worktrees".into(),              source: "obra/superpowers".into(), installs: 0, description: "Use git worktrees to work on multiple branches simultaneously.".into() },
        FeaturedSkill { id: "obra/superpowers/using-superpowers".into(),                name: "using-superpowers".into(),                source: "obra/superpowers".into(), installs: 0, description: "Meta-skill: how to discover and apply skills from this collection.".into() },
        FeaturedSkill { id: "obra/superpowers/verification-before-completion".into(),   name: "verification-before-completion".into(),   source: "obra/superpowers".into(), installs: 0, description: "Run a verification checklist before marking any task as done.".into() },
        FeaturedSkill { id: "obra/superpowers/writing-plans".into(),                    name: "writing-plans".into(),                    source: "obra/superpowers".into(), installs: 0, description: "Create clear, actionable plans that can be executed without ambiguity.".into() },
        FeaturedSkill { id: "obra/superpowers/writing-skills".into(),                   name: "writing-skills".into(),                   source: "obra/superpowers".into(), installs: 0, description: "Author new skills that teach AI agents how to handle recurring tasks.".into() },
    ]
}
