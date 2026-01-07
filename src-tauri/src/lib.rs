mod gastown;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
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
        .invoke_handler(tauri::generate_handler![
            gastown::run_gt_command,
            gastown::read_beads_file,
            gastown::list_tmux_sessions,
            gastown::get_tmux_panes,
            gastown::capture_tmux_pane,
            gastown::get_session_details,
            gastown::attach_tmux_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
