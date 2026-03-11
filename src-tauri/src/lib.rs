pub mod commands;
pub mod marketplace;
pub mod registry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::clients::detect_installed_clients,
      commands::clients::get_client_config,
      commands::clients::read_mcp_servers,
      commands::clients::list_claude_code_scopes,
      commands::config::parse_toml_servers,
      commands::config::write_client_config,
      commands::config::write_raw_config,
      commands::config::create_backup,
      commands::config::list_backups,
      commands::config::restore_backup,
      commands::config::read_backup,
      commands::config::delete_backup,
      commands::config::validate_config,
      commands::config::create_default_config,
      commands::audit::get_audit_logs,
      commands::audit::clear_audit_logs,
      commands::audit::export_audit_logs,
      commands::audit::log_audit_entry,
      commands::utils::get_home_dir,
      commands::cli::install_cli,
      commands::cli::check_cli_installed,
      commands::io::export_tsr,
      commands::io::import_tsr,
    ])
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
