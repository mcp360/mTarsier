pub mod commands;
pub mod marketplace;
pub mod registry;
pub mod tray;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(commands::updater::PendingUpdate(Mutex::new(None)))
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
      commands::server::read_mtarsier_store,
      commands::server::write_mtarsier_store,
      commands::updater::check_for_update,
      commands::updater::install_update,
      commands::tray::update_tray_tooltip,
      commands::skills::list_skills,
      commands::skills::write_skill,
      commands::skills::delete_skill,
      commands::skills::read_skill,
      commands::skills::reveal_in_finder,
      commands::skills::skills_search,
      commands::skills::skills_install,
    ])
    .plugin(tauri_plugin_updater::Builder::new().build())
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

      // Setup macOS menu bar icon
      tray::setup_tray(app)?;

      // macOS convention: red-X hides window instead of quitting
      #[cfg(target_os = "macos")]
      {
        if let Some(main_win) = app.get_webview_window("main") {
          let app_handle = app.handle().clone();
          main_win.on_window_event(move |event: &tauri::WindowEvent| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
              api.prevent_close();
              if let Some(w) = app_handle.get_webview_window("main") {
                w.hide().ok();
              }
            }
          });
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
