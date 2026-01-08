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

// Molecule/Workflow visualization types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StepStatus {
    Pending,
    Active,
    Complete,
    Failed,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoleculeStep {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: StepStatus,
    pub depends_on: Vec<String>,  // IDs of steps this depends on
    pub assignee: Option<String>,
    pub started_at: Option<u64>,
    pub completed_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Molecule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub steps: Vec<MoleculeStep>,
    pub created_at: Option<u64>,
    pub updated_at: Option<u64>,
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

// Molecule visualization commands

/// List all molecules (workflow instances)
#[tauri::command]
pub async fn list_molecules() -> Result<Vec<Molecule>, String> {
    // Use bd list to get molecule beads
    let output = Command::new("bd")
        .args(["list", "--type=molecule", "--json"])
        .output()
        .map_err(|e| format!("Failed to list molecules: {}", e))?;

    if !output.status.success() {
        // Try alternative without --json for parsing
        let output = Command::new("bd")
            .args(["list", "--type=molecule"])
            .output()
            .map_err(|e| format!("Failed to list molecules: {}", e))?;

        // Parse text output
        let stdout = String::from_utf8_lossy(&output.stdout);
        let molecules: Vec<Molecule> = stdout
            .lines()
            .filter_map(|line| {
                // Format: id [priority] [type] status - title
                let parts: Vec<&str> = line.splitn(2, " - ").collect();
                if parts.len() >= 2 {
                    let prefix = parts[0];
                    let title = parts[1];

                    // Extract ID from prefix
                    let id = prefix.split_whitespace().next().unwrap_or("").to_string();
                    let status = if prefix.contains("open") { "open" }
                        else if prefix.contains("in_progress") { "in_progress" }
                        else if prefix.contains("closed") { "closed" }
                        else { "unknown" };

                    Some(Molecule {
                        id,
                        name: title.to_string(),
                        description: None,
                        status: status.to_string(),
                        steps: vec![],  // Steps loaded separately
                        created_at: None,
                        updated_at: None,
                    })
                } else {
                    None
                }
            })
            .collect();

        return Ok(molecules);
    }

    // Parse JSON output if available
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse molecules JSON: {}", e))
}

/// Get detailed molecule info with steps
#[tauri::command]
pub async fn get_molecule_details(molecule_id: String) -> Result<Molecule, String> {
    // Get molecule info using bd show
    let output = Command::new("bd")
        .args(["show", &molecule_id, "--json"])
        .output()
        .map_err(|e| format!("Failed to get molecule: {}", e))?;

    if !output.status.success() {
        // Fallback: try gt mol show
        let output = Command::new("gt")
            .args(["mol", "show", &molecule_id])
            .output()
            .map_err(|e| format!("Failed to get molecule: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse molecule from gt mol show output
        return parse_molecule_from_text(&molecule_id, &stdout);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse molecule JSON: {}", e))
}

/// Parse molecule from text output (fallback)
fn parse_molecule_from_text(id: &str, text: &str) -> Result<Molecule, String> {
    let mut steps: Vec<MoleculeStep> = Vec::new();
    let mut name = id.to_string();
    let mut description = None;
    let mut status = "unknown".to_string();

    let lines: Vec<&str> = text.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();

        // Parse title/name
        if line.starts_with(&format!("{}:", id)) || line.contains(": ") && i == 0 {
            let parts: Vec<&str> = line.splitn(2, ": ").collect();
            if parts.len() >= 2 {
                name = parts[1].to_string();
            }
        }

        // Parse status
        if line.starts_with("Status:") {
            status = line.replace("Status:", "").trim().to_string();
        }

        // Parse description
        if line.starts_with("Description:") {
            let mut desc_lines = Vec::new();
            i += 1;
            while i < lines.len() && !lines[i].trim().is_empty() && !lines[i].contains(":") {
                desc_lines.push(lines[i].trim());
                i += 1;
            }
            description = Some(desc_lines.join("\n"));
            continue;
        }

        // Parse steps - look for step patterns
        if line.contains("[") && (line.contains("pending") || line.contains("complete") ||
            line.contains("active") || line.contains("failed")) {
            // This looks like a step line
            let step_status = if line.contains("complete") { StepStatus::Complete }
                else if line.contains("active") { StepStatus::Active }
                else if line.contains("failed") { StepStatus::Failed }
                else if line.contains("blocked") { StepStatus::Blocked }
                else { StepStatus::Pending };

            // Extract step ID and title
            let step_parts: Vec<&str> = line.split_whitespace().collect();
            if !step_parts.is_empty() {
                let step_id = step_parts[0].to_string();
                let step_title = step_parts.iter().skip(3).map(|s| *s).collect::<Vec<_>>().join(" ");

                steps.push(MoleculeStep {
                    id: step_id,
                    title: step_title,
                    description: None,
                    status: step_status,
                    depends_on: vec![],
                    assignee: None,
                    started_at: None,
                    completed_at: None,
                });
            }
        }

        i += 1;
    }

    Ok(Molecule {
        id: id.to_string(),
        name,
        description,
        status,
        steps,
        created_at: None,
        updated_at: None,
    })
}

/// Get a demo molecule for testing visualization
#[tauri::command]
pub async fn get_demo_molecule() -> Result<Molecule, String> {
    // Return a demo molecule for testing the visualizer
    Ok(Molecule {
        id: "demo-mol".to_string(),
        name: "GastownUI Feature Development".to_string(),
        description: Some("Demo molecule showing a typical feature workflow".to_string()),
        status: "in_progress".to_string(),
        steps: vec![
            MoleculeStep {
                id: "design".to_string(),
                title: "Design Feature".to_string(),
                description: Some("Create design document and mockups".to_string()),
                status: StepStatus::Complete,
                depends_on: vec![],
                assignee: Some("designer".to_string()),
                started_at: Some(1704600000),
                completed_at: Some(1704686400),
            },
            MoleculeStep {
                id: "implement".to_string(),
                title: "Implement Feature".to_string(),
                description: Some("Write the code implementation".to_string()),
                status: StepStatus::Active,
                depends_on: vec!["design".to_string()],
                assignee: Some("polecat-toast".to_string()),
                started_at: Some(1704686400),
                completed_at: None,
            },
            MoleculeStep {
                id: "test".to_string(),
                title: "Write Tests".to_string(),
                description: Some("Create unit and integration tests".to_string()),
                status: StepStatus::Pending,
                depends_on: vec!["implement".to_string()],
                assignee: None,
                started_at: None,
                completed_at: None,
            },
            MoleculeStep {
                id: "review".to_string(),
                title: "Code Review".to_string(),
                description: Some("Review code changes".to_string()),
                status: StepStatus::Pending,
                depends_on: vec!["implement".to_string(), "test".to_string()],
                assignee: None,
                started_at: None,
                completed_at: None,
            },
            MoleculeStep {
                id: "merge".to_string(),
                title: "Merge to Main".to_string(),
                description: Some("Submit to refinery merge queue".to_string()),
                status: StepStatus::Pending,
                depends_on: vec!["review".to_string()],
                assignee: None,
                started_at: None,
                completed_at: None,
            },
        ],
        created_at: Some(1704600000),
        updated_at: Some(1704772800),
    })
}
