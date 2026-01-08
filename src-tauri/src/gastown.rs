use serde::{Deserialize, Serialize};
use std::process::Command;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct TmuxSession {
    pub name: String,
    pub windows: i32,
    pub attached: bool,
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
        .args(["list-sessions", "-F", "#{session_name}:#{session_windows}:#{session_attached}"])
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
                })
            } else {
                None
            }
        })
        .collect();

    Ok(sessions)
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
