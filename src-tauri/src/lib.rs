mod gastown;
mod voice;
mod self_test;
mod instruct;
mod setup;

use voice::VoiceServerState;
use self_test::SelfTestState;
use instruct::InstructState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(VoiceServerState::default())
        .manage(SelfTestState::default())
        .manage(InstructState::default())
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
            gastown::get_session_details,
            gastown::get_tmux_panes,
            gastown::capture_tmux_pane,
            gastown::attach_tmux_session,
            gastown::get_molecule_progress,
            gastown::list_active_molecules,
            voice::start_voice_server,
            voice::stop_voice_server,
            voice::get_voice_server_status,
            voice::send_voice_input,
            voice::stream_voice_input,
            voice::send_text_to_speech,
            voice::transcribe_audio,
            voice::get_voice_personas,
            self_test::get_self_test_status,
            self_test::get_test_cases,
            self_test::start_self_test,
            self_test::stop_self_test,
            self_test::add_test_case,
            instruct::get_instruct_status,
            instruct::set_instruct_model,
            instruct::query_deep,
            setup::check_go_installation,
            setup::check_beads_installation,
            setup::get_platform_info,
            setup::get_setup_status,
            setup::get_go_install_instructions,
            setup::get_beads_install_instructions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
