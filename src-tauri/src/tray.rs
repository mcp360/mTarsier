use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let header = MenuItem::new(app, "mTarsier", false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let open = MenuItem::with_id(app, "open", "Open mTarsier", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&header, &sep1, &open, &sep2, &quit])?;

    let mut builder = TrayIconBuilder::with_id("tray")
        .menu(&menu)
        .tooltip("mTarsier \u{2014} MCP Server Manager")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray_icon: &TrayIcon<_>, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray_icon.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;

    app.on_menu_event(|app, event| match event.id().as_ref() {
        "open" => show_main_window(app),
        "quit" => app.exit(0),
        _ => {}
    });

    Ok(())
}

pub fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        win.show().ok();
        win.set_focus().ok();
    }
}
