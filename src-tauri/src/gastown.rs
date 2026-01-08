use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Molecule step status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StepStatus {
    Pending,
    InProgress,
    Completed,
    Blocked,
    Skipped,
}

/// A single step in a molecule workflow
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoleculeStep {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: StepStatus,
    pub agent: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub dependencies: Vec<String>,
}

/// Full molecule workflow structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Molecule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub steps: Vec<MoleculeStep>,
    pub current_step: Option<String>,
    pub progress: f32,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TmuxSession {
    pub name: String,
    pub windows: i32,
    pub attached: bool,
    pub activity: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
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
#[serde(rename_all = "snake_case")]
pub struct TmuxSessionDetail {
    pub session: TmuxSession,
    pub panes: Vec<TmuxPane>,
    pub health: String,
    pub connection_string: String,
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

/// List all tmux sessions
#[tauri::command]
pub async fn list_tmux_sessions() -> Result<Vec<TmuxSession>, String> {
    let output = Command::new("tmux")
        .args([
            "list-sessions",
            "-F",
            "#{session_name}\t#{session_windows}\t#{session_attached}\t#{session_activity}",
        ])
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
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 4 {
                Some(TmuxSession {
                    name: parts[0].to_string(),
                    windows: parts[1].parse().unwrap_or(0),
                    attached: parts[2] == "1",
                    activity: parts[3].parse().ok(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(sessions)
}

#[tauri::command]
pub async fn get_tmux_panes(session_name: String) -> Result<Vec<TmuxPane>, String> {
    let output = Command::new("tmux")
        .args([
            "list-panes",
            "-t",
            &session_name,
            "-F",
            "#{session_name}\t#{window_index}\t#{window_name}\t#{pane_index}\t#{pane_id}\t#{pane_active}\t#{pane_current_command}\t#{pane_pid}",
        ])
        .output()
        .map_err(|e| format!("Failed to list tmux panes: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list tmux panes: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let panes: Vec<TmuxPane> = stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
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

#[tauri::command]
pub async fn capture_tmux_pane(target: String, lines: Option<i32>) -> Result<String, String> {
    let line_count = lines.unwrap_or(30).max(1);
    let output = Command::new("tmux")
        .args([
            "capture-pane",
            "-p",
            "-t",
            &target,
            "-S",
            &format!("-{}", line_count),
        ])
        .output()
        .map_err(|e| format!("Failed to capture tmux pane: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to capture tmux pane: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn session_health(session: &TmuxSession, _panes: &[TmuxPane]) -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let delta = session
        .activity
        .map(|last| now.saturating_sub(last))
        .unwrap_or(i64::MAX);

    if delta < 10 {
        return "active".to_string();
    }

    if delta < 60 {
        return "processing".to_string();
    }

    "idle".to_string()
}

#[tauri::command]
pub async fn get_session_details(session_name: String) -> Result<TmuxSessionDetail, String> {
    let sessions = list_tmux_sessions().await?;
    let session = sessions
        .into_iter()
        .find(|s| s.name == session_name)
        .ok_or_else(|| "Tmux session not found".to_string())?;

    let panes = get_tmux_panes(session.name.clone()).await.unwrap_or_default();
    let health = session_health(&session, &panes);

    Ok(TmuxSessionDetail {
        session: session.clone(),
        panes,
        health,
        connection_string: format!("tmux attach -t {}", session.name),
    })
}

#[tauri::command]
pub async fn attach_tmux_session(session_name: String) -> Result<(), String> {
    let attach_cmd = format!("tmux attach -t {}", session_name);

    #[cfg(target_os = "macos")]
    {
        let escaped = attach_cmd.replace('"', "\\\"");
        Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "tell application \"Terminal\" to do script \"{}\"",
                    escaped
                ),
                "-e",
                "tell application \"Terminal\" to activate",
            ])
            .output()
            .map_err(|e| format!("Failed to launch Terminal: {}", e))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("sh")
            .arg("-c")
            .arg(format!("x-terminal-emulator -e {}", attach_cmd))
            .output()
            .map_err(|e| format!("Failed to launch terminal: {}", e))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &attach_cmd])
            .output()
            .map_err(|e| format!("Failed to launch terminal: {}", e))?;
        return Ok(());
    }
}

/// Get molecule progress for a given root issue
#[tauri::command]
pub async fn get_molecule_progress(issue_id: String) -> Result<Molecule, String> {
    let output = Command::new("gt")
        .args(["mol", "progress", &issue_id, "--json"])
        .output()
        .map_err(|e| format!("Failed to get molecule progress: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get molecule: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse molecule JSON: {}", e))
}

// ===== Activity Feed =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEvent {
    pub timestamp: String,
    pub event_type: String,      // "created", "closed", "updated", "merged", "claimed"
    pub actor: Option<String>,   // Who did it
    pub target_id: String,       // Issue ID
    pub target_title: String,    // Issue title
    pub details: Option<String>, // Extra info like close_reason
}

#[derive(Debug, Deserialize)]
struct BeadsIssue {
    id: String,
    title: String,
    status: String,
    #[serde(default)]
    issue_type: Option<String>,
    #[serde(default)]
    assignee: Option<String>,
    created_at: String,
    created_by: Option<String>,
    updated_at: String,
    #[serde(default)]
    closed_at: Option<String>,
    #[serde(default)]
    close_reason: Option<String>,
}

/// Find the beads directory, following redirect if present
fn find_beads_dir() -> Option<std::path::PathBuf> {
    // Try current directory first
    let cwd = std::env::current_dir().ok()?;

    // Look for .beads in current dir or parent dirs
    let mut dir = cwd.as_path();
    loop {
        let beads_dir = dir.join(".beads");
        if beads_dir.exists() {
            // Check for redirect
            let redirect_file = beads_dir.join("redirect");
            if redirect_file.exists() {
                if let Ok(redirect_path) = std::fs::read_to_string(&redirect_file) {
                    let redirect_path = redirect_path.trim();
                    // Handle relative redirects
                    let target = if redirect_path.starts_with('/') {
                        std::path::PathBuf::from(redirect_path)
                    } else {
                        beads_dir.join(redirect_path)
                    };
                    if target.exists() {
                        return Some(target);
                    }
                }
            }
            return Some(beads_dir);
        }

        // Move up to parent
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    // Try ~/gt/.beads as fallback
    if let Some(home) = dirs::home_dir() {
        let gt_beads = home.join("gt").join(".beads");
        if gt_beads.exists() {
            return Some(gt_beads);
        }
    }

    None
}

/// Get activity feed from beads issues.jsonl (direct file read)
#[tauri::command]
pub async fn get_activity_feed(limit: Option<usize>) -> Result<Vec<ActivityEvent>, String> {
    let max_events = limit.unwrap_or(50);
    let mut events: Vec<ActivityEvent> = Vec::new();

    // Find beads directory
    let beads_dir = find_beads_dir()
        .ok_or_else(|| "Could not find .beads directory".to_string())?;

    // First try interactions.jsonl (preferred for real-time events)
    let interactions_path = beads_dir.join("interactions.jsonl");
    let issues_path = beads_dir.join("issues.jsonl");

    // Read issues.jsonl to generate events
    if issues_path.exists() {
        let content = std::fs::read_to_string(&issues_path)
            .map_err(|e| format!("Failed to read issues.jsonl: {}", e))?;

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            let issue: BeadsIssue = match serde_json::from_str(line) {
                Ok(i) => i,
                Err(_) => continue, // Skip malformed lines
            };

            // Skip certain event types that clutter the feed
            let issue_type = issue.issue_type.as_deref().unwrap_or("");
            if issue_type == "event" {
                continue; // Skip session-ended events etc
            }

            // Generate events from issue lifecycle

            // 1. Closed event (most important - work completed)
            if issue.status == "closed" {
                if let Some(ref closed_at) = issue.closed_at {
                    events.push(ActivityEvent {
                        timestamp: closed_at.clone(),
                        event_type: "closed".to_string(),
                        actor: issue.assignee.clone().or_else(|| issue.created_by.clone()),
                        target_id: issue.id.clone(),
                        target_title: issue.title.clone(),
                        details: issue.close_reason.clone(),
                    });
                }
            }

            // 2. Merged event (for merge-requests)
            if issue_type == "merge-request" && issue.status == "closed" {
                if let Some(ref closed_at) = issue.closed_at {
                    events.push(ActivityEvent {
                        timestamp: closed_at.clone(),
                        event_type: "merged".to_string(),
                        actor: Some("refinery".to_string()),
                        target_id: issue.id.clone(),
                        target_title: issue.title.clone(),
                        details: None,
                    });
                }
            }

            // 3. Claimed event (when assigned)
            if issue.assignee.is_some() && issue.status == "in_progress" {
                events.push(ActivityEvent {
                    timestamp: issue.updated_at.clone(),
                    event_type: "claimed".to_string(),
                    actor: issue.assignee.clone(),
                    target_id: issue.id.clone(),
                    target_title: issue.title.clone(),
                    details: None,
                });
            }

            // 4. Created event
            events.push(ActivityEvent {
                timestamp: issue.created_at.clone(),
                event_type: "created".to_string(),
                actor: issue.created_by.clone(),
                target_id: issue.id.clone(),
                target_title: issue.title.clone(),
                details: None,
            });
        }
    }

    // Also check interactions.jsonl for additional events (if it has content)
    if interactions_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&interactions_path) {
            if !content.trim().is_empty() {
                for line in content.lines() {
                    if line.trim().is_empty() {
                        continue;
                    }
                    if let Ok(event) = serde_json::from_str::<ActivityEvent>(line) {
                        events.push(event);
                    }
                }
            }
        }
    }

    // Sort by timestamp descending (most recent first)
    events.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    // Deduplicate by (timestamp, event_type, target_id)
    events.dedup_by(|a, b| {
        a.timestamp == b.timestamp && a.event_type == b.event_type && a.target_id == b.target_id
    });

    // Limit results
    events.truncate(max_events);

    Ok(events)
}

/// List all active molecules (workflows in progress)
#[tauri::command]
pub async fn list_active_molecules() -> Result<Vec<Molecule>, String> {
    // Get molecules by looking for in_progress beads with molecule attachments
    let output = Command::new("bd")
        .args(["list", "--json", "--status=in_progress", "--type=molecule"])
        .output()
        .map_err(|e| format!("Failed to list molecules: {}", e))?;

    if !output.status.success() {
        // If command fails, return empty list (no molecules)
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return Ok(vec![]);
    }

    // Parse the JSON output - it may be a list of issues
    let issues: Vec<serde_json::Value> = serde_json::from_str(&stdout)
        .unwrap_or_else(|_| vec![]);

    // For each issue, try to get its molecule progress
    let mut molecules = Vec::new();
    for issue in issues {
        if let Some(id) = issue.get("id").and_then(|v| v.as_str()) {
            if let Ok(mol) = get_molecule_progress_internal(id) {
                molecules.push(mol);
            }
        }
    }

    Ok(molecules)
}

fn get_molecule_progress_internal(issue_id: &str) -> Result<Molecule, String> {
    let output = Command::new("gt")
        .args(["mol", "progress", issue_id, "--json"])
        .output()
        .map_err(|e| format!("Failed to get molecule: {}", e))?;

    if !output.status.success() {
        return Err("No molecule found".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| e.to_string())
}
