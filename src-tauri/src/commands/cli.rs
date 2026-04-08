use std::path::PathBuf;
use super::utils::silent_command;
use tauri::Manager;

#[derive(serde::Serialize)]
pub struct CliInstallResult {
    pub path: String,
    pub needs_path_update: bool,
}

/// Locate the compiled tsr binary:
/// - dev:     same dir as the app binary (target/debug/tsr)
/// - release: Tauri resource directory (bundled sidecar)
fn find_tsr_binary(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    #[cfg(windows)]
    let name = "tsr.exe";
    #[cfg(not(windows))]
    let name = "tsr";

    // Release: Tauri unpacks the sidecar into resource_dir
    if let Ok(dir) = app.path().resource_dir() {
        let p = dir.join(name);
        if p.exists() {
            return Ok(p);
        }
    }

    // Dev: compiled alongside the app binary in target/debug/
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let p = dir.join(name);
            if p.exists() {
                return Ok(p);
            }
        }
    }

    Err(format!(
        "tsr binary not found. Run `cargo build --bin tsr` first."
    ))
}

fn cli_install_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let base = dirs::data_local_dir().ok_or("Cannot locate LocalAppData")?;
        Ok(base.join("Programs").join("tsr"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let home = dirs::home_dir().ok_or("Cannot locate home directory")?;
        Ok(home.join(".local").join("bin"))
    }
}

fn is_dir_in_path(dir: &PathBuf) -> bool {
    let Ok(path_var) = std::env::var("PATH") else {
        return false;
    };
    let sep = if cfg!(windows) { ';' } else { ':' };
    path_var.split(sep).any(|p| {
        let candidate = PathBuf::from(p);
        candidate == *dir
            || candidate.canonicalize().ok().as_deref() == dir.canonicalize().ok().as_deref()
    })
}

#[tauri::command]
pub async fn install_cli(app: tauri::AppHandle) -> Result<CliInstallResult, String> {
    let src = find_tsr_binary(&app)?;
    let dir = cli_install_dir()?;

    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Cannot create {}: {e}", dir.display()))?;

    #[cfg(windows)]
    let dest = dir.join("tsr.exe");
    #[cfg(not(windows))]
    let dest = dir.join("tsr");

    std::fs::copy(&src, &dest)
        .map_err(|e| format!("Failed to copy binary: {e}"))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dest, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set permissions: {e}"))?;
    }

    let needs_path_update = !is_dir_in_path(&dir);

    Ok(CliInstallResult {
        path: dest.to_string_lossy().to_string(),
        needs_path_update,
    })
}

#[tauri::command]
pub fn check_cli_installed() -> Option<String> {
    #[cfg(windows)]
    let name = "tsr.exe";
    #[cfg(not(windows))]
    let name = "tsr";

    // Check ~/.local/bin
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".local/bin").join(name);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    // Check /usr/local/bin
    #[cfg(not(windows))]
    {
        let p = PathBuf::from("/usr/local/bin").join(name);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    // Check Windows install dir
    #[cfg(windows)]
    if let Some(base) = dirs::data_local_dir() {
        let p = base.join("Programs/tsr").join(name);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    // Fall back to PATH lookup
    #[cfg(not(windows))]
    let which = "which";
    #[cfg(windows)]
    let which = "where";

    if let Ok(out) = silent_command(which).arg("tsr").output() {
        if out.status.success() {
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    None
}
