use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmuxSession {
    pub name: String,
    pub windows: i32,
    pub attached: bool,
    pub activity: Option<u64>,  // Last activity timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmuxPane {
    pub session_name: String,
    pub window_index: i32,
    pub window_name: String,
    pub pane_index: i32,
    pub pane_id: String,
    pub pane_active: bool,
    pub pane_current_command: String,
    pub pane_pid: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmuxSessionDetail {
    pub session: TmuxSession,
    pub panes: Vec<TmuxPane>,
    pub health: SessionHealth,
    pub connection_string: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionHealth {
    Active,      // Recently active, responding
    Processing,  // Running a command
    Idle,        // No recent activity
    Stuck,       // Potentially stuck (long-running with no output)
}

/// Run a gt or bd command and return the output
#[tauri::command]
pub async fn run_gt_command(cmd: String, args: Vec<String>) -> Result<CommandResult, String> {
    let output = Command::new(&cmd)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

/// Run a generic shell command (for setup detection)
#[tauri::command]
pub async fn run_shell_command(command: String, args: Vec<String>) -> Result<CommandResult, String> {
    let output = Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", command, e))?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

/// Read a beads file (issues.jsonl or interactions.jsonl)
#[tauri::command]
pub async fn read_beads_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read beads file {}: {}", path, e))
}

/// List all tmux sessions with activity timestamps
#[tauri::command]
pub async fn list_tmux_sessions() -> Result<Vec<TmuxSession>, String> {
    let output = Command::new("tmux")
        .args(["list-sessions", "-F", "#{session_name}:#{session_windows}:#{session_attached}:#{session_activity}"])
        .output()
        .map_err(|e| format!("Failed to list tmux sessions: {}", e))?;

    if !output.status.success() {
        // No sessions might return non-zero
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let sessions: Vec<TmuxSession> = stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 {
                Some(TmuxSession {
                    name: parts[0].to_string(),
                    windows: parts[1].parse().unwrap_or(0),
                    attached: parts[2] == "1",
                    activity: parts.get(3).and_then(|s| s.parse().ok()),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(sessions)
}

/// List all panes for a given session
#[tauri::command]
pub async fn get_tmux_panes(session_name: String) -> Result<Vec<TmuxPane>, String> {
    let output = Command::new("tmux")
        .args([
            "list-panes",
            "-t", &session_name,
            "-a",
            "-F",
            "#{session_name}:#{window_index}:#{window_name}:#{pane_index}:#{pane_id}:#{pane_active}:#{pane_current_command}:#{pane_pid}",
        ])
        .output()
        .map_err(|e| format!("Failed to list panes: {}", e))?;

    if !output.status.success() {
        return Err(format!("Session '{}' not found", session_name));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let panes: Vec<TmuxPane> = stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 8 {
                Some(TmuxPane {
                    session_name: parts[0].to_string(),
                    window_index: parts[1].parse().unwrap_or(0),
                    window_name: parts[2].to_string(),
                    pane_index: parts[3].parse().unwrap_or(0),
                    pane_id: parts[4].to_string(),
                    pane_active: parts[5] == "1",
                    pane_current_command: parts[6].to_string(),
                    pane_pid: parts[7].parse().unwrap_or(0),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(panes)
}

/// Capture the content of a tmux pane
#[tauri::command]
pub async fn capture_tmux_pane(target: String, lines: Option<i32>) -> Result<String, String> {
    let line_count = lines.unwrap_or(50);
    let start_line = format!("-{}", line_count);

    let output = Command::new("tmux")
        .args([
            "capture-pane",
            "-t", &target,
            "-p",                    // Print to stdout
            "-S", &start_line,       // Start from N lines back
            "-E", "-1",              // End at last line
        ])
        .output()
        .map_err(|e| format!("Failed to capture pane: {}", e))?;

    if !output.status.success() {
        return Err(format!("Failed to capture pane '{}': {}", target,
            String::from_utf8_lossy(&output.stderr)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get detailed session info with health status
#[tauri::command]
pub async fn get_session_details(session_name: String) -> Result<TmuxSessionDetail, String> {
    // Get basic session info
    let output = Command::new("tmux")
        .args([
            "list-sessions",
            "-F", "#{session_name}:#{session_windows}:#{session_attached}:#{session_activity}",
            "-f", &format!("#{{==:#{{session_name}},{}}}", session_name),
        ])
        .output()
        .map_err(|e| format!("Failed to get session: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().next().ok_or_else(|| format!("Session '{}' not found", session_name))?;
    let parts: Vec<&str> = line.split(':').collect();

    if parts.len() < 3 {
        return Err(format!("Invalid session data for '{}'", session_name));
    }

    let activity_timestamp: Option<u64> = parts.get(3).and_then(|s| s.parse().ok());

    let session = TmuxSession {
        name: parts[0].to_string(),
        windows: parts[1].parse().unwrap_or(0),
        attached: parts[2] == "1",
        activity: activity_timestamp,
    };

    // Get panes
    let panes = get_tmux_panes(session_name.clone()).await?;

    // Determine health based on activity and current command
    let health = determine_session_health(&session, &panes);

    let connection_string = format!("tmux attach -t {}", session_name);

    Ok(TmuxSessionDetail {
        session,
        panes,
        health,
        connection_string,
    })
}

/// Determine session health based on activity patterns
fn determine_session_health(session: &TmuxSession, panes: &[TmuxPane]) -> SessionHealth {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // Check if any pane is running a long-lived process
    let has_processing = panes.iter().any(|p| {
        let cmd = p.pane_current_command.to_lowercase();
        // Common long-running processes that indicate active work
        cmd.contains("vim") || cmd.contains("nvim") || cmd.contains("claude") ||
        cmd.contains("cargo") || cmd.contains("npm") || cmd.contains("node") ||
        cmd.contains("python") || cmd.contains("make")
    });

    // Check for shell prompts (idle but responsive)
    let all_shells = panes.iter().all(|p| {
        let cmd = p.pane_current_command.to_lowercase();
        cmd.contains("zsh") || cmd.contains("bash") || cmd.contains("fish") || cmd.contains("sh")
    });

    // Activity-based health
    if let Some(activity) = session.activity {
        let seconds_since_activity = now.saturating_sub(activity);

        if seconds_since_activity < 10 {
            return SessionHealth::Active;
        } else if seconds_since_activity < 60 && has_processing {
            return SessionHealth::Processing;
        } else if seconds_since_activity < 300 {
            if all_shells {
                return SessionHealth::Idle;
            }
            return SessionHealth::Processing;
        } else if has_processing {
            // Long time since activity but process still running
            return SessionHealth::Stuck;
        }
    }

    if session.attached {
        SessionHealth::Active
    } else if all_shells {
        SessionHealth::Idle
    } else {
        SessionHealth::Processing
    }
}

/// Open a terminal and attach to a tmux session
#[tauri::command]
pub async fn attach_tmux_session(session_name: String) -> Result<(), String> {
    // On macOS, open a new Terminal window with tmux attach
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "tmux attach -t {}"
            end tell"#,
            session_name
        );

        Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On Linux, try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm", "alacritty", "kitty"];
        let mut success = false;

        for term in terminals {
            let result = match term {
                "gnome-terminal" => Command::new(term)
                    .args(["--", "tmux", "attach", "-t", &session_name])
                    .spawn(),
                "konsole" | "alacritty" | "kitty" => Command::new(term)
                    .args(["-e", "tmux", "attach", "-t", &session_name])
                    .spawn(),
                _ => Command::new(term)
                    .args(["-e", &format!("tmux attach -t {}", session_name)])
                    .spawn(),
            };

            if result.is_ok() {
                success = true;
                break;
            }
        }

        if !success {
            return Err("No supported terminal emulator found".to_string());
        }
    }

    Ok(())
}
