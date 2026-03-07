use tauri_plugin_dialog::{DialogExt, FilePath};

/// Open a native save dialog and write the content to the chosen .tsr file.
/// Returns `true` if saved, `false` if the user cancelled.
#[tauri::command]
pub async fn export_tsr(
    app: tauri::AppHandle,
    content: String,
    filename: String,
) -> Result<bool, String> {
    let result = app
        .dialog()
        .file()
        .set_title("Export MCP Servers")
        .add_filter("Tarsier", &["tsr"])
        .set_file_name(&filename)
        .blocking_save_file();

    match result {
        Some(FilePath::Path(path)) => std::fs::write(&path, content.as_bytes())
            .map(|_| true)
            .map_err(|e| format!("Failed to write file: {}", e)),
        Some(_) => Err("Unsupported path type".to_string()),
        None => Ok(false),
    }
}

/// Open a native file picker filtered to .tsr/.json and return the file content.
/// Returns `null` if the user cancelled.
#[tauri::command]
pub async fn import_tsr(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let result = app
        .dialog()
        .file()
        .set_title("Import MCP Servers")
        .add_filter("Tarsier / JSON", &["tsr", "json"])
        .blocking_pick_file();

    match result {
        Some(FilePath::Path(path)) => std::fs::read_to_string(&path)
            .map(Some)
            .map_err(|e| format!("Failed to read file: {}", e)),
        Some(_) => Err("Unsupported path type".to_string()),
        None => Ok(None),
    }
}
